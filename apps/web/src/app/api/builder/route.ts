import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Stripe from "stripe";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendHITLApproval } from "@/lib/telegram/notify";

const client = new OpenAI();

export async function POST(req: NextRequest) {
  try {
    const { opportunity, action } = await req.json();

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity data required" }, { status: 400 });
    }

    const db = getSupabaseServer();

    // ──────────────────────────────────────────────
    // ACTION: generate_copy
    // ──────────────────────────────────────────────
    if (action === "generate_copy") {
      const copyPrompt = `You are the Builder Bee for CyberHound. Generate complete landing page copy for this SaaS opportunity.

Niche: ${opportunity.niche}
Market: ${opportunity.market}
Price Point: ${opportunity.recommended_price_point}
MRR Potential: ${opportunity.estimated_mrr_potential}
Queen Assessment: ${opportunity.queen_reasoning}

Return ONLY this JSON (no markdown):
{
  "headline": "<powerful, benefit-driven headline — max 10 words>",
  "subheadline": "<1-2 sentence value prop>",
  "pain_points": ["<pain 1>", "<pain 2>", "<pain 3>"],
  "features": [
    {"title": "<feature 1>", "description": "<one sentence>"},
    {"title": "<feature 2>", "description": "<one sentence>"},
    {"title": "<feature 3>", "description": "<one sentence>"},
    {"title": "<feature 4>", "description": "<one sentence>"}
  ],
  "testimonial": {"quote": "<realistic testimonial>", "author": "<Name, Title, Company>"},
  "cta_primary": "<CTA button text>",
  "cta_secondary": "<secondary CTA>",
  "pricing_name": "<plan name e.g. Pro, Growth, Starter>",
  "pricing_description": "<what's included in 1 sentence>",
  "seo_title": "<SEO-optimized page title under 60 chars>",
  "seo_description": "<meta description under 160 chars>"
}`;

      const completion = await client.chat.completions.create({
        model: "gemini-2.5-flash",
        messages: [{ role: "user", content: copyPrompt }],
        max_tokens: 1500,
        temperature: 0.6,
      });

      const rawResponse = completion.choices[0]?.message?.content ?? "{}";
      try {
        const cleaned = rawResponse.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const copy = JSON.parse(cleaned);

        // Log to hive
        await db.from("hive_log").insert({
          bee: "builder",
          action: `Generated landing page copy for: ${opportunity.niche}`,
          details: { niche: opportunity.niche, copy },
          status: "success",
        });

        return NextResponse.json({ copy, status: "draft" });
      } catch {
        return NextResponse.json({ error: "Failed to parse copy", raw: rawResponse }, { status: 500 });
      }
    }

    // ──────────────────────────────────────────────
    // ACTION: create_stripe_product (HITL gated)
    // ──────────────────────────────────────────────
    if (action === "create_stripe_product") {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey || stripeKey === "sk_test_placeholder") {
        const approvalId = `stripe_${Date.now()}`;
        await sendHITLApproval({
          approvalId,
          actionType: "create_stripe_product",
          summary: `Create Stripe product: ${opportunity.niche}`,
          details: `💵 Price: ${opportunity.recommended_price_point}\n📊 MRR Potential: ${opportunity.estimated_mrr_potential}\n\n⚠️ Configure STRIPE_SECRET_KEY to execute.`,
        });

        return NextResponse.json({
          error: "Stripe not configured",
          hitl_required: true,
          message: "HITL alert sent to Telegram. Configure STRIPE_SECRET_KEY to execute.",
        }, { status: 400 });
      }

      const stripe = new Stripe(stripeKey);

      // Parse price from string like "$197/mo" → 19700 cents
      const priceStr = String(opportunity.recommended_price_point ?? "$97");
      const priceMatch = priceStr.match(/\$?(\d+)/);
      const priceInCents = priceMatch ? parseInt(priceMatch[1]) * 100 : 9700;

      // Create Stripe product
      const product = await stripe.products.create({
        name: String(opportunity.niche),
        description: String(opportunity.queen_reasoning ?? `CyberHound automated product for ${opportunity.niche}`),
        metadata: {
          cyberhound: "true",
          market: String(opportunity.market ?? "North America"),
          score: String(opportunity.score ?? 0),
          generated_by: "builder_bee",
          opportunity_id: String(opportunity.id ?? ""),
        },
      });

      // Create price in CAD (account currency)
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: priceInCents,
        currency: "cad",
        recurring: { interval: "month" },
      });

      // Create payment link
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: {
          cyberhound: "true",
          niche: String(opportunity.niche),
          opportunity_id: String(opportunity.id ?? ""),
        },
      });

      // Persist campaign to Supabase
      const { data: campaign } = await db.from("campaigns").insert({
        opportunity_id: opportunity.id ?? null,
        name: String(opportunity.niche),
        niche: String(opportunity.niche),
        status: "live",
        mrr: 0,
        customers: 0,
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        payment_link: paymentLink.url,
      }).select("id").single();

      // Update opportunity status to approved
      if (opportunity.id) {
        await db.from("opportunities").update({ status: "approved" }).eq("id", opportunity.id);
      }

      // Log to hive
      await db.from("hive_log").insert({
        bee: "builder",
        action: `Launched campaign: ${opportunity.niche}`,
        details: {
          product_id: product.id,
          price_id: price.id,
          payment_link: paymentLink.url,
          campaign_id: campaign?.id,
          price_cad: `$${priceInCents / 100} CAD/mo`,
        },
        status: "success",
      });

      // Telegram HITL — notify campaign is live, ask to start outreach
      sendHITLApproval({
        approvalId: campaign?.id ?? `live_${product.id}`,
        actionType: "start_outreach",
        summary: `🚀 ${opportunity.niche} is LIVE`,
        details: `🔗 Payment Link: ${paymentLink.url}\n💵 Price: $${priceInCents / 100} CAD/mo\n📊 MRR Potential: ${opportunity.estimated_mrr_potential}\n\nApprove to deploy Closer Bee outreach, or veto to pause.`,
      }).catch(console.error);

      return NextResponse.json({
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        payment_link_url: paymentLink.url,
        campaign_id: campaign?.id,
        status: "live",
        currency: "cad",
        price_cents: priceInCents,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[Builder API]", error);
    return NextResponse.json({ error: "Builder Bee encountered an error" }, { status: 500 });
  }
}
