import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Stripe from "stripe";
import { sendHITLApproval } from "@/lib/telegram/notify";

const client = new OpenAI();

export async function POST(req: NextRequest) {
  try {
    const { opportunity, action } = await req.json();

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity data required" }, { status: 400 });
    }

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

        // Log to Supabase (non-blocking)
        logToHive("builder", `Generated landing page copy for: ${opportunity.niche}`, { copy }).catch(console.error);

        return NextResponse.json({ copy, status: "draft" });
      } catch {
        return NextResponse.json({ error: "Failed to parse copy", raw: rawResponse }, { status: 500 });
      }
    }

    // ──────────────────────────────────────────────
    // ACTION: create_stripe_product (requires HITL)
    // ──────────────────────────────────────────────
    if (action === "create_stripe_product") {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey || stripeKey === "sk_test_placeholder") {
        // Send HITL alert even without Stripe configured
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

      const product = await stripe.products.create({
        name: String(opportunity.niche),
        description: String(opportunity.queen_reasoning ?? `CyberHound automated product for ${opportunity.niche}`),
        metadata: {
          cyberhound: "true",
          market: String(opportunity.market),
          score: String(opportunity.score ?? 0),
          generated_by: "builder_bee",
        },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: priceInCents,
        currency: "usd",
        recurring: { interval: "month" },
      });

      const paymentLink = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
      });

      // Log to hive
      logToHive("builder", `Created Stripe product: ${opportunity.niche}`, {
        product_id: product.id,
        price_id: price.id,
        payment_link: paymentLink.url,
      }).catch(console.error);

      // Notify via Telegram
      sendHITLApproval({
        approvalId: `live_${product.id}`,
        actionType: "campaign_live",
        summary: `${opportunity.niche} is LIVE`,
        details: `🔗 Payment Link: ${paymentLink.url}\n💵 Price: $${priceInCents / 100}/mo\n\nApprove to start outreach, or veto to pause.`,
      }).catch(console.error);

      return NextResponse.json({
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        payment_link_url: paymentLink.url,
        status: "live",
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[Builder API]", error);
    return NextResponse.json({ error: "Builder Bee encountered an error" }, { status: 500 });
  }
}

async function logToHive(bee: string, action: string, details: Record<string, unknown>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) return;

  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(supabaseUrl, supabaseKey!);
  await db.from("hive_log").insert({ bee, action, details, status: "success" });
}
