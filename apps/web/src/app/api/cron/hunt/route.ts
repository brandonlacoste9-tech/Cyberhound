/**
 * CyberHound — Autonomous Hunt Cron
 *
 * Runs every 6 hours. Full pipeline:
 *   1. Picks N niches from the rotating target list
 *   2. Calls Scout Bee on each → score + persist
 *   3. Auto-approved opportunities (score ≥ 70, competition != high) → Builder Bee
 *      Builder generates landing page copy + Stripe product automatically
 *   4. For each new live campaign → Closer Bee generates outreach sequence (HITL via Telegram)
 *   5. Logs everything to hive_log + notifies Telegram
 *
 * Auth: Vercel Cron adds Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/llm/client";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendHiveUpdate, sendHITLApproval } from "@/lib/telegram/notify";
import { publicOriginFromHeaders } from "@/lib/site/public-origin";

export const runtime = "nodejs";
export const maxDuration = 300;

// ── Niche rotation list ────────────────────────────────────────────────────────
// Queen Bee picks from these every cycle; add or remove niches freely
const NICHE_TARGETS = [
  "AI scheduling automation for dental clinics",
  "AI invoice processing for small accounting firms",
  "Automated job application tracking for recruiting agencies",
  "AI-powered review management for local service businesses",
  "Automated permit tracking SaaS for contractors",
  "AI chatbot for HVAC and plumbing companies",
  "Automated proposal generation for freelance agencies",
  "AI-powered social media scheduling for e-commerce brands",
  "Automated onboarding workflows for SaaS startups",
  "AI lead qualification for real estate brokers",
  "Automated payroll reminders for small construction firms",
  "AI content repurposing tool for B2B marketers",
];

// How many niches to scout per cron run (keep low to stay within timeout)
const NICHES_PER_RUN = 3;

// ── Helpers ────────────────────────────────────────────────────────────────────

function shouldAutoApprove(score: number, competition: string): boolean {
  const minScore = Number(process.env.SCOUT_AUTO_APPROVE_MIN_SCORE ?? 70);
  if (String(competition).toLowerCase() === "high") return false;
  return score >= minScore;
}

async function scoutNiche(
  niche: string,
  market: string,
  firecrawlKey: string | undefined
): Promise<Record<string, unknown> | null> {
  let searchContext = "";

  if (firecrawlKey && firecrawlKey !== "placeholder" && !firecrawlKey.endsWith("-")) {
    try {
      const fcRes = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firecrawlKey}`,
        },
        body: JSON.stringify({
          query: `${niche} SaaS market demand ${market} pricing 2025 2026`,
          limit: 5,
        }),
      });
      const fcData = await fcRes.json();
      const results = (fcData.data ?? []) as Array<{ url?: string; markdown?: string }>;
      if (results.length > 0) {
        searchContext = results
          .map((r) => `URL: ${r.url ?? "unknown"}\n${(r.markdown ?? "").slice(0, 600)}`)
          .join("\n\n---\n\n");
      }
    } catch (e) {
      console.warn("[Hunt Cron] Firecrawl error:", (e as Error).message);
    }
  }

  const prompt = `You are the Scout Bee for CyberHound. Analyze this B2B SaaS market opportunity.

Niche: ${niche}
Market: ${market}
${searchContext ? `\nWeb Intelligence:\n${searchContext}` : "\nUsing internal market knowledge."}

Return EXACTLY this JSON (no markdown, no explanation):
{
  "niche": "${niche}",
  "market": "${market}",
  "score": <integer 0-100 — be honest>,
  "demand_signals": [<3-5 specific demand signals>],
  "competition_level": "<low|medium|high>",
  "estimated_mrr_potential": "<e.g. $5K-$20K/mo>",
  "recommended_price_point": "<e.g. $197/mo>",
  "queen_reasoning": "<2-3 sentence strategic rationale>",
  "sources": ${searchContext ? '["web_search"]' : '[]'}
}`;

  try {
    const raw = await chat([{ role: "user", content: prompt }], {
      max_tokens: 1024,
      temperature: 0.2,
      response_format: { type: "json_object" },
    });
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("[Hunt Cron] Scout parse error:", e);
    return null;
  }
}

async function triggerBuilder(
  opportunity: Record<string, unknown>,
  opportunityId: string,
  origin: string
): Promise<{ campaign_id: string; landing_page_url: string } | null> {
  const db = getSupabaseServer();

  // Generate landing page copy via LLM
  const copyPrompt = `You are the Builder Bee for CyberHound. Generate complete landing page copy.

Niche: ${opportunity.niche}
Market: ${opportunity.market}
Price Point: ${opportunity.recommended_price_point}
MRR Potential: ${opportunity.estimated_mrr_potential}
Assessment: ${opportunity.queen_reasoning}

Return ONLY this JSON (no markdown):
{
  "headline": "<powerful, benefit-driven — max 10 words>",
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
  "pricing_name": "<plan name>",
  "pricing_description": "<what's included in 1 sentence>",
  "seo_title": "<SEO page title under 60 chars>",
  "seo_description": "<meta description under 160 chars>"
}`;

  try {
    const raw = await chat([{ role: "user", content: copyPrompt }], {
      max_tokens: 1500,
      temperature: 0.6,
      response_format: { type: "json_object" },
    });
    const copy = JSON.parse(raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim());

    const { data: campaign, error: campErr } = await db
      .from("campaigns")
      .insert({
        name: String(opportunity.niche).slice(0, 200),
        opportunity_id: opportunityId,
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
      console.error("[Hunt Cron] Campaign insert:", campErr);
      return null;
    }

    const landing_page_url = `${origin}/l/${campaign.id}`;

    await db.from("campaigns").update({ landing_page_url }).eq("id", campaign.id);

    await db.from("assets").insert({
      campaign_id: campaign.id,
      type: "copy",
      content: copy,
      status: "live",
      url: landing_page_url,
    });

    await db.from("opportunities").update({
      campaign_id: campaign.id,
      status: "building",
    }).eq("id", opportunityId);

    await db.from("hive_log").insert({
      bee: "builder",
      action: `Auto-built landing page: ${opportunity.niche}`,
      details: { niche: opportunity.niche, campaign_id: campaign.id, landing_page_url },
      status: "success",
    });

    // If Stripe is configured, create product + payment link automatically
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey && stripeKey !== "placeholder" && stripeKey !== "sk_test_placeholder" && stripeKey.startsWith("sk_")) {
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(stripeKey);

        const priceStr = String(opportunity.recommended_price_point ?? "$97");
        const priceMatch = priceStr.match(/\$?(\d+)/);
        const priceInCents = priceMatch ? parseInt(priceMatch[1]) * 100 : 9700;

        const product = await stripe.products.create({
          name: String(opportunity.niche),
          description: String(opportunity.queen_reasoning ?? ""),
          metadata: { cyberhound: "true", opportunity_id: opportunityId, generated_by: "hunt_cron" },
        });

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: priceInCents,
          currency: "cad",
          recurring: { interval: "month" },
        });

        const paymentLink = await stripe.paymentLinks.create({
          line_items: [{ price: price.id, quantity: 1 }],
          metadata: { cyberhound: "true", niche: String(opportunity.niche), opportunity_id: opportunityId },
        });

        await db.from("campaigns").update({
          stripe_product_id: product.id,
          stripe_price_id: price.id,
          stripe_payment_link: paymentLink.url,
          status: "live",
        }).eq("id", campaign.id);

        await db.from("hive_log").insert({
          bee: "builder",
          action: `Stripe product live: ${opportunity.niche}`,
          details: { product_id: product.id, payment_link: paymentLink.url, campaign_id: campaign.id },
          status: "success",
        });
      } catch (stripeErr) {
        console.error("[Hunt Cron] Stripe error:", stripeErr);
      }
    }

    return { campaign_id: campaign.id, landing_page_url };
  } catch (e) {
    console.error("[Hunt Cron] Builder error:", e);
    return null;
  }
}

async function triggerCloser(
  opportunity: Record<string, unknown>,
  campaign: { campaign_id: string; landing_page_url: string }
): Promise<void> {
  const db = getSupabaseServer();

  // Generate a 3-email sequence for a generic decision-maker in the niche
  const closerPrompt = `You are the Closer Bee for CyberHound. Generate a 3-email cold outreach sequence.

Niche: ${opportunity.niche}
Market: ${opportunity.market}
MRR Potential: ${opportunity.estimated_mrr_potential}
Pain: ${(opportunity.demand_signals as string[] ?? []).join(", ")}
Landing Page: ${campaign.landing_page_url}

RULES:
- Under 150 words per email
- Use {{FIRST_NAME}} and {{COMPANY}} as placeholders
- Curiosity-driven subject lines
- Sign as: Brandon | CyberHound
- Email 3 must include the landing page URL as CTA

Return ONLY a valid JSON array:
[
  {"sequence_number": 1, "subject": "...", "body": "...", "send_delay_days": 0, "goal": "pain_hook"},
  {"sequence_number": 2, "subject": "...", "body": "...", "send_delay_days": 3, "goal": "social_proof"},
  {"sequence_number": 3, "subject": "...", "body": "...", "send_delay_days": 7, "goal": "urgency_close"}
]`;

  try {
    const raw = await chat([{ role: "user", content: closerPrompt }], {
      max_tokens: 2048,
      temperature: 0.8,
    });

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const sequence = JSON.parse(jsonMatch?.[0] ?? raw);

    const approvalId = `hunt_outreach_${campaign.campaign_id}_${Date.now()}`;

    await db.from("outreach_log").insert({
      campaign_id: campaign.campaign_id,
      sequence,
      status: "pending_approval",
      approval_id: approvalId,
      recipient_count: 0,
    });

    await db.from("hive_log").insert({
      bee: "closer",
      action: `Outreach sequence ready: ${opportunity.niche}`,
      details: { approval_id: approvalId, campaign_id: campaign.campaign_id, sequence },
      status: "pending_approval",
    });

    // HITL via Telegram — Brandon approves before any emails go out
    await sendHITLApproval({
      approvalId,
      actionType: "send_outreach_sequence",
      summary: `🚀 Campaign live: ${opportunity.niche}`,
      details: `🌐 Landing: ${campaign.landing_page_url}\n💰 MRR Potential: ${opportunity.estimated_mrr_potential}\n\n📬 Email 1: "${sequence[0]?.subject}"\n📬 Email 2: "${sequence[1]?.subject}" (+3d)\n📬 Email 3: "${sequence[2]?.subject}" (+7d)\n\n⚠️ Approve to start sending outreach, or veto to skip.`,
    });
  } catch (e) {
    console.error("[Hunt Cron] Closer error:", e);
  }
}

// ── Main handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Verify cron auth
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET ?? process.env.SCHEDULER_SECRET ?? "cyberhound-scheduler";
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseServer();
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  const origin = publicOriginFromHeaders(req.headers) ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyberhound.vercel.app";
  const market = "North America";

  // Pick NICHES_PER_RUN niches, rotating by time of day to cover all over time
  const hour = new Date().getUTCHours();
  const offset = (Math.floor(hour / (24 / (NICHE_TARGETS.length / NICHES_PER_RUN))) * NICHES_PER_RUN) % NICHE_TARGETS.length;
  const niches = NICHE_TARGETS.slice(offset, offset + NICHES_PER_RUN);

  const results: Array<{
    niche: string;
    score: number;
    auto_approved: boolean;
    campaign_id?: string;
    landing_page_url?: string;
    closer_queued?: boolean;
  }> = [];

  await sendHiveUpdate(
    `🤖 *Hunt Cron Started*\n\nScouting ${niches.length} niches:\n${niches.map((n) => `• ${n}`).join("\n")}`
  );

  for (const niche of niches) {
    const opportunity = await scoutNiche(niche, market, firecrawlKey);
    if (!opportunity) continue;

    const score = Number(opportunity.score ?? 0);
    const competition = String(opportunity.competition_level ?? "medium");
    const autoApproved = shouldAutoApprove(score, competition);
    const nowIso = new Date().toISOString();

    // Persist opportunity
    const { data: oppRow, error: oppErr } = await db
      .from("opportunities")
      .insert({
        niche: String(opportunity.niche ?? niche),
        market: String(opportunity.market ?? market),
        score,
        demand_signals: (opportunity.demand_signals as string[]) ?? [],
        competition_level: competition,
        estimated_mrr_potential: String(opportunity.estimated_mrr_potential ?? "$0"),
        recommended_price_point: String(opportunity.recommended_price_point ?? "$0"),
        queen_reasoning: String(opportunity.queen_reasoning ?? ""),
        status: autoApproved ? "approved" : "pending_approval",
        ...(autoApproved ? { approved_at: nowIso } : {}),
      })
      .select("id")
      .single();

    if (oppErr) {
      console.error("[Hunt Cron] Opportunity insert:", oppErr);
      continue;
    }

    const opportunityId = oppRow?.id as string;

    await db.from("hive_log").insert({
      bee: "scout",
      action: autoApproved
        ? `Auto-approved: ${niche} (score ${score})`
        : `Scouted: ${niche} (score ${score} — needs approval)`,
      details: { ...opportunity, opportunity_id: opportunityId, auto_approved: autoApproved },
      status: autoApproved ? "success" : "pending_approval",
    });

    const result: (typeof results)[number] = { niche, score, auto_approved: autoApproved };

    if (autoApproved) {
      // Trigger Builder Bee automatically
      const campaignResult = await triggerBuilder(opportunity, opportunityId, origin);
      if (campaignResult) {
        result.campaign_id = campaignResult.campaign_id;
        result.landing_page_url = campaignResult.landing_page_url;

        // Trigger Closer Bee — generates sequence + sends HITL approval
        await triggerCloser(opportunity, campaignResult);
        result.closer_queued = true;
      }
    } else {
      // Send HITL approval for low-scoring opportunities
      if (score >= 60) {
        await sendHITLApproval({
          approvalId: opportunityId,
          actionType: "approve_opportunity",
          summary: `${niche} — ${market}`,
          details: `📊 Score: ${score}/100\n💰 MRR Potential: ${opportunity.estimated_mrr_potential}\n💵 Price: ${opportunity.recommended_price_point}\n🏆 Competition: ${competition}\n\n👑 ${opportunity.queen_reasoning}`,
        });
      }
    }

    results.push(result);

    // Small delay between scouts
    await new Promise((r) => setTimeout(r, 1500));
  }

  const autoApprovedCount = results.filter((r) => r.auto_approved).length;
  const campaignsBuilt = results.filter((r) => r.campaign_id).length;

  await sendHiveUpdate(
    `✅ *Hunt Cron Complete*\n\n🔍 Niches scouted: ${results.length}\n✅ Auto-approved: ${autoApprovedCount}\n🚀 Campaigns built: ${campaignsBuilt}\n📧 Outreach queued: ${results.filter((r) => r.closer_queued).length}\n\n${results.map((r) => `• ${r.niche} — ${r.score}/100 ${r.auto_approved ? "✅" : "⏳"}`).join("\n")}`
  );

  return NextResponse.json({
    scouted: results.length,
    auto_approved: autoApprovedCount,
    campaigns_built: campaignsBuilt,
    results,
  });
}
