import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/llm/client";
import { publicOriginFromRequest } from "@/lib/site/public-origin";
import Stripe from "stripe";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { sendHiveUpdate } from "@/lib/telegram/notify";

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
      const copyPrompt = `You write landing page copy for a real B2B SaaS product (think Stripe, Linear, Notion — calm and credible).

Niche: ${opportunity.niche}
Market: ${opportunity.market}
Price Point: ${opportunity.recommended_price_point}
Context: ${opportunity.queen_reasoning}

RULES:
- Sound like a real company, not an AI agent or crypto product
- NO words: sovereignty, institutional grade, colony, cyberhound, neural, deploy to infrastructure
- Headline: plain benefit, 6–12 words
- Subheadline: concrete outcome for a specific buyer (ops lead, clinic manager, founder)
- Pain points: specific operational pains (not vague "keep up with regulations")
- Features: practical capabilities a buyer would pay for
- CTA: "Start free trial" or "Get started" or "Book a demo" — not hype
- Testimonial: omit fake people — set "quote" and "author" to empty strings ""
- Pricing description must include the price point as e.g. "$149/mo"

Return ONLY this JSON (no markdown):
{
  "headline": "<benefit headline>",
  "subheadline": "<1-2 sentences, specific buyer + outcome>",
  "pain_points": ["<specific pain 1>", "<specific pain 2>", "<specific pain 3>"],
  "features": [
    {"title": "<short title>", "description": "<one concrete sentence>"},
    {"title": "<short title>", "description": "<one concrete sentence>"},
    {"title": "<short title>", "description": "<one concrete sentence>"},
    {"title": "<short title>", "description": "<one concrete sentence>"}
  ],
  "testimonial": {"quote": "", "author": ""},
  "cta_primary": "Start free trial",
  "cta_secondary": "See how it works",
  "pricing_name": "Professional",
  "pricing_description": "<include $price/mo and what's included>",
  "seo_title": "<under 60 chars>",
  "seo_description": "<under 160 chars>"
}`;

      const rawResponse =
        (
          await chat([{ role: "user", content: copyPrompt }], {
            max_tokens: 1500,
            temperature: 0.6,
            response_format: { type: "json_object" },
          })
        ).trim() || "{}";
      try {
        const cleaned = rawResponse.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const copy = JSON.parse(cleaned) as Record<string, unknown>;

        const origin = publicOriginFromRequest(req);
        const name = String(opportunity.niche ?? "Campaign").slice(0, 200);

        const { data: campaign, error: campErr } = await db
          .from("campaigns")
          .insert({
            name,
            opportunity_id: opportunity.id ?? null,
            status: "building",
            landing_page_url: null,
            mrr: 0,
                    niche: opportunity.niche,
            customer_count: 0,
            target_mrr: 0,
            stripe_product_id: null,
            stripe_price_id: null,
            stripe_payment_link: null,
          })
          .select("id")
          .single();

        if (campErr || !campaign) {
          console.error("[Builder] campaign insert", campErr);
          await db.from("hive_log").insert({
            bee: "builder",
            action: `Generated copy (no campaign row): ${name}`,
            details: { niche: opportunity.niche, copy, error: campErr?.message },
            status: "error",
          });
          return NextResponse.json(
            { copy, status: "draft", persist_error: "Could not create campaign row" },
            { status: 200 }
          );
        }

        const landing_page_url = `${origin}/l/${campaign.id}`;

        await db.from("campaigns").update({ landing_page_url }).eq("id", campaign.id);

        const { error: assetErr } = await db.from("assets").insert({
          campaign_id: campaign.id,
          type: "copy",
          content: copy as Json,
          status: "live",
          url: landing_page_url,
        });

        if (assetErr) {
          console.error("[Builder] asset insert", assetErr);
        }

        if (opportunity.id) {
          await db
            .from("opportunities")
            .update({ campaign_id: campaign.id, status: "building" })
            .eq("id", opportunity.id);
        }

        await db.from("hive_log").insert({
          bee: "builder",
          action: `Generated landing page copy for: ${name}`,
          details: { niche: opportunity.niche, copy, campaign_id: campaign.id, landing_page_url },
          status: "success",
        });

        return NextResponse.json({
          copy,
          status: "draft",
          campaign_id: campaign.id,
          landing_page_url,
        });
      } catch {
        return NextResponse.json({ error: "Failed to parse copy", raw: rawResponse }, { status: 500 });
      }
    }

    // ──────────────────────────────────────────────
    // ACTION: create_stripe_product (autonomous launch)
    // ──────────────────────────────────────────────
    if (action === "create_stripe_product") {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey || stripeKey === "sk_test_placeholder") {
        return NextResponse.json(
          {
            error: "Stripe not configured",
            message: "Autonomous launch requires STRIPE_SECRET_KEY.",
          },
          { status: 400 }
        );
      }

      const isLive = stripeKey.startsWith("sk_live_");
      const mode = isLive ? "LIVE" : "TEST";

      await db.from("hive_log").insert({
        bee: "builder",
        action: `Starting autonomous Stripe deployment [${mode}]`,
        details: { mode, niche: opportunity.niche },
        status: "success",
      });

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

      const origin = publicOriginFromRequest(req);
      const campaignIdExisting =
        typeof opportunity.campaign_id === "string" ? opportunity.campaign_id : null;

      let campaign: { id: string } | null = null;

      if (campaignIdExisting) {
        const landing_page_url = `${origin}/l/${campaignIdExisting}`;
        const { data, error } = await db
          .from("campaigns")
          .update({
            stripe_product_id: product.id,
            stripe_price_id: price.id,
            stripe_payment_link: paymentLink.url,
            status: "live",
            landing_page_url,
          })
          .eq("id", campaignIdExisting)
          .select("id")
          .single();
        if (error) {
          console.error("[Builder] campaign update", error);
        } else {
          campaign = data;
        }
      }

      if (!campaign) {
        const { data: inserted, error: insErr } = await db
          .from("campaigns")
          .insert({
            opportunity_id: opportunity.id ?? null,
            name: String(opportunity.niche),
            status: "live",
            mrr: 0,
            customer_count: 0,
            target_mrr: 0,
                    niche: opportunity.niche,
            stripe_product_id: product.id,
            stripe_price_id: price.id,
            stripe_payment_link: paymentLink.url,
            landing_page_url: null,
          })
          .select("id")
          .single();

        if (insErr || !inserted) {
          console.error("[Builder] campaign insert", insErr);
          return NextResponse.json(
            { error: "Failed to persist campaign", details: insErr?.message },
            { status: 500 }
          );
        }

        campaign = inserted;
        const landing_page_url = `${origin}/l/${inserted.id}`;
        await db.from("campaigns").update({ landing_page_url }).eq("id", inserted.id);
      }

      if (opportunity.id && campaign) {
        await db
          .from("opportunities")
          .update({ status: "approved", campaign_id: campaign.id })
          .eq("id", opportunity.id);
      }

      // Log to hive
      await db.from("hive_log").insert({
        bee: "builder",
        action: `Launched campaign: ${opportunity.niche}`,
        details: {
          product_id: product.id,
          price_id: price.id,
          payment_link: paymentLink.url,
          landing_page_url: `${origin}/l/${campaign.id}`,
          campaign_id: campaign.id,
          price_cad: `$${priceInCents / 100} CAD/mo`,
        },
        status: "success",
      });

      await sendHiveUpdate(
        `🚀 *Builder Bee Launch Complete*\n\n` +
        `Campaign: ${opportunity.niche}\n` +
        `🌐 Landing: ${origin}/l/${campaign.id}\n` +
        `🔗 Payment Link: ${paymentLink.url}\n` +
        `💵 Price: $${priceInCents / 100} CAD/mo\n` +
        `📊 MRR Potential: ${opportunity.estimated_mrr_potential}\n\n` +
        `_Autonomous launch complete — outreach can begin immediately._`
      ).catch(console.error);

      return NextResponse.json({
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        payment_link_url: paymentLink.url,
        campaign_id: campaign.id,
        landing_page_url: `${origin}/l/${campaign.id}`,
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
