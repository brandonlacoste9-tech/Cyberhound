/**
 * CyberHound — Stripe Webhook
 * POST /api/stripe-webhook
 *
 * Handles:
 *   checkout.session.completed  → one-time payment (audit $750)
 *   invoice.payment_succeeded   → subscription payment (retainer $3500/mo)
 *   customer.subscription.deleted → churn / cancel
 *
 * On payment:
 *   1. Logs revenue_event to Supabase
 *   2. Updates outreach_log status → 'converted'
 *   3. Updates campaign MRR + customer_count
 *   4. Fires notify (Discord/Telegram) — DEAL CLOSED
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Stripe requires raw body for signature verification
export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey);
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;

  // Verify webhook signature
  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      // Dev mode — no signature check
      event = JSON.parse(rawBody) as Stripe.Event;
      console.warn("[Stripe Webhook] ⚠️  No signature verification — dev mode");
    }
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = getSupabaseServer();

  try {
    switch (event.type) {

      // ── ONE-TIME PAYMENT (audit $750 or any checkout) ──────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_email
          ?? (session.customer_details?.email ?? null);
        const amountCents = session.amount_total ?? 0;

        console.log(`[Stripe] 💰 checkout.session.completed | ${customerEmail} | $${amountCents / 100}`);

        await handlePayment({
          db, stripe,
          customerEmail,
          amountCents,
          currency: session.currency ?? "cad",
          stripeEventId: event.id,
          eventType: event.type,
          subscriptionId: null,
          metadata: session.metadata ?? {},
        });
        break;
      }

      // ── SUBSCRIPTION PAYMENT (retainer $3500/mo) ───────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerEmail = invoice.customer_email ?? null;
        const amountCents = invoice.amount_paid ?? 0;
        const subscriptionId = typeof invoice.subscription === "string"
          ? invoice.subscription : null;

        // Skip $0 invoices (trial starts etc)
        if (amountCents === 0) break;

        console.log(`[Stripe] 💰 invoice.payment_succeeded | ${customerEmail} | $${amountCents / 100}`);

        await handlePayment({
          db, stripe,
          customerEmail,
          amountCents,
          currency: invoice.currency ?? "cad",
          stripeEventId: event.id,
          eventType: event.type,
          subscriptionId,
          metadata: (invoice.metadata as Record<string, string>) ?? {},
        });
        break;
      }

      // ── SUBSCRIPTION CANCELLED (churn) ─────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        // Get customer email
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const customerEmail = customer.email ?? null;

        console.log(`[Stripe] 📉 subscription.deleted | ${customerEmail}`);

        if (customerEmail) {
          // Update outreach log to 'churned'
          await db
            .from("outreach_log")
            .update({ status: "bounced" })
            .eq("recipient", customerEmail)
            .eq("status", "converted");

          // Update campaign customer count
          const productId = sub.items.data[0]?.price?.product as string | undefined;
          if (productId) {
            const { data: campaign } = await db
              .from("campaigns")
              .select("id, customer_count, mrr")
              .eq("stripe_product_id", productId)
              .maybeSingle();

            if (campaign) {
              await db
                .from("campaigns")
                .update({
                  customer_count: Math.max(0, (campaign.customer_count ?? 1) - 1),
                  mrr: Math.max(0, (campaign.mrr ?? 0) - (sub.items.data[0]?.price?.unit_amount ?? 0)),
                })
                .eq("id", campaign.id);
            }
          }
        }

        await notifyDeal({
          type: "CHURN",
          email: customerEmail ?? "unknown",
          amount: 0,
        });
        break;
      }

      default:
        // Unhandled event — ignore
        break;
    }

    return NextResponse.json({ received: true });

  } catch (err) {
    console.error("[Stripe Webhook] Processing error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}


// ══════════════════════════════════════════════════════════════
// HANDLE PAYMENT — shared logic for checkout + invoice
// ══════════════════════════════════════════════════════════════

async function handlePayment(params: {
  db: ReturnType<typeof getSupabaseServer>;
  stripe: Stripe;
  customerEmail: string | null;
  amountCents: number;
  currency: string;
  stripeEventId: string;
  eventType: string;
  subscriptionId: string | null;
  metadata: Record<string, string>;
}) {
  const { db, customerEmail, amountCents, currency, stripeEventId, eventType, subscriptionId, metadata } = params;

  // 1. Log revenue_event (idempotent — unique on stripe_event_id)
  const { error: revErr } = await db
    .from("revenue_events")
    .upsert({
      stripe_event_id: stripeEventId,
      event_type: eventType,
      amount: amountCents,
      currency,
      customer_email: customerEmail,
      metadata,
    }, { onConflict: "stripe_event_id", ignoreDuplicates: true });

  if (revErr) {
    console.error("[Stripe] revenue_events upsert error:", revErr.message);
  }

  if (!customerEmail) return;

  // 2. Update outreach_log → converted
  const { error: outErr } = await db
    .from("outreach_log")
    .update({
      status: "converted",
      replied_at: new Date().toISOString(),
    })
    .eq("recipient", customerEmail)
    .in("status", ["sent", "opened", "replied"]);

  if (outErr) {
    console.error("[Stripe] outreach_log update error:", outErr.message);
  }

  // 3. Update campaign MRR if subscription
  if (subscriptionId) {
    const stripe = params.stripe;
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const productId = sub.items.data[0]?.price?.product as string | undefined;

    if (productId) {
      const { data: campaign } = await db
        .from("campaigns")
        .select("id, customer_count, mrr")
        .eq("stripe_product_id", productId)
        .maybeSingle();

      if (campaign) {
        await db
          .from("campaigns")
          .update({
            status: "closing",
            mrr: (campaign.mrr ?? 0) + amountCents,
            customer_count: (campaign.customer_count ?? 0) + 1,
          })
          .eq("id", campaign.id);
      }
    }
  }

  // 4. Fire deal closed notification
  await notifyDeal({
    type: "WON",
    email: customerEmail,
    amount: amountCents / 100,
    currency: currency.toUpperCase(),
  });
}


// ══════════════════════════════════════════════════════════════
// NOTIFY — fires the existing /api/notify endpoint
// ══════════════════════════════════════════════════════════════

async function notifyDeal(params: {
  type: "WON" | "CHURN";
  email: string;
  amount: number;
  currency?: string;
}) {
  const { type, email, amount, currency = "CAD" } = params;

  const emoji = type === "WON" ? "🏆" : "📉";
  const message = type === "WON"
    ? `${emoji} DEAL CLOSED: ${email} — $${amount} ${currency}`
    : `${emoji} CHURN: ${email} cancelled`;

  console.log(`[Stripe Webhook] ${message}`);

  // Fire internal notify (Telegram/Discord)
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await fetch(`${baseUrl}/api/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, type: type === "WON" ? "success" : "warning" }),
    });
  } catch (e) {
    // Non-critical — don't fail the webhook
    console.warn("[Stripe] Notify failed:", e);
  }
}
