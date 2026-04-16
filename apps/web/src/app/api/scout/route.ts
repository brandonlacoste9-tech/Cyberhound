import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/llm/client";
import { findRecentOpportunity } from "@/lib/autonomy";
import { buildSearchContext, hasLiveSearchProvider, searchWeb } from "@/lib/live-search";
import { publicOriginFromRequest } from "@/lib/site/public-origin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendHiveUpdate } from "@/lib/telegram/notify";

function shouldAutoApproveScout(score: number, competitionLevel: string): boolean {
  const minScore = Number(process.env.SCOUT_AUTO_APPROVE_MIN_SCORE);
  const threshold = Number.isFinite(minScore) && minScore > 0 ? minScore : 70;
  if (String(competitionLevel).toLowerCase() === "high") return false;
  return score >= threshold;
}

async function triggerAutonomousBuilder(req: NextRequest, opportunity: Record<string, unknown>) {
  const origin = publicOriginFromRequest(req);

  const copyRes = await fetch(`${origin}/api/builder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ opportunity, action: "generate_copy" }),
    cache: "no-store",
  });
  const copyData = await copyRes.json();
  if (!copyRes.ok || !copyData?.campaign_id) {
    return { copy: copyData, launch: null };
  }

  let launchData: Record<string, unknown> | null = null;
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "sk_test_placeholder") {
    const launchRes = await fetch(`${origin}/api/builder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opportunity: { ...opportunity, campaign_id: copyData.campaign_id },
        action: "create_stripe_product",
      }),
      cache: "no-store",
    });
    launchData = await launchRes.json();
  }

  return { copy: copyData, launch: launchData };
}

export async function POST(req: NextRequest) {
  try {
    const { niche, market = "North America" } = await req.json();

    if (!niche) {
      return NextResponse.json({ error: "Niche required" }, { status: 400 });
    }

    const db = getSupabaseServer();
    await db.from("hive_log").insert({
      bee: "scout",
      action: `Investigating niche: ${niche}`,
      details: { market, niche },
      status: "success",
    });

    if (!hasLiveSearchProvider()) {
      return NextResponse.json(
        { error: "Scout requires a live search provider (FIRECRAWL_API_KEY or APIFY_API_TOKEN)." },
        { status: 503 }
      );
    }

    const recentOpportunity = await findRecentOpportunity({ niche, market, maxAgeDays: 7 });
    if (recentOpportunity) {
      return NextResponse.json({
        opportunity: recentOpportunity,
        opportunityId: recentOpportunity.id,
        autoApproved: ["approved", "building", "live"].includes(recentOpportunity.status),
        autoRejected: recentOpportunity.status === "rejected",
        duplicate: true,
      });
    }

    const searchResults = await searchWeb(
      `${niche} SaaS market demand ${market} pricing 2025 2026`,
      5
    );

    if (searchResults.length === 0) {
      await db.from("hive_log").insert({
        bee: "scout",
        action: `Investigation failed: No results for ${niche}`,
        details: { market, niche, query: `${niche} SaaS market demand ${market} pricing 2025 2026` },
        status: "failed",
      });
      return NextResponse.json(
        { error: "Scout found no live web results for that niche. No synthetic analysis was generated." },
        { status: 422 }
      );
    }

    await db.from("hive_log").insert({
      bee: "scout",
      action: `Intelligence gathered for: ${niche}`,
      details: { results: searchResults.map(r => ({ url: r.url, title: r.title })), count: searchResults.length },
      status: "success",
    });

    const searchContext = buildSearchContext(searchResults, 600);

    // Step 2: Structured opportunity analysis
    const prompt = `You are the Scout Bee for CyberHound — an autonomous revenue agent. Analyze this market opportunity and return ONLY a valid JSON object.

Niche: ${niche}
Market: ${market}

Web Intelligence:
${searchContext}

Return EXACTLY this JSON structure (no markdown, no explanation, just the JSON):
{
  "niche": "${niche}",
  "market": "${market}",
  "score": <integer 0-100, be honest — 70+ means genuinely strong opportunity>,
  "demand_signals": [<3-5 specific, concrete demand signals as strings>],
  "competition_level": "<low|medium|high>",
  "estimated_mrr_potential": "<e.g. $5K-$20K/mo>",
  "recommended_price_point": "<e.g. $97/mo or $297/mo>",
  "queen_reasoning": "<2-3 sentence strategic assessment of why this is or isn't a strong play>",
  "sources": [${searchResults.map((r) => JSON.stringify(r.url)).join(", ")}]
}`;

    const rawResponse =
      (
        await chat([{ role: "user", content: prompt }], {
          max_tokens: 1024,
          temperature: 0.2,
          response_format: { type: "json_object" },
        })
      ).trim() || "{}";

    let opportunity: Record<string, unknown>;
    try {
      const cleaned = rawResponse
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      opportunity = JSON.parse(cleaned);
    } catch {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          opportunity = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json(
            { error: "Scout failed to parse analysis", raw: rawResponse },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Scout returned invalid format", raw: rawResponse },
          { status: 500 }
        );
      }
    }

    const score = Number(opportunity.score ?? 0);
    const competitionLevel = String(opportunity.competition_level ?? "medium");
    const autoApproved = shouldAutoApproveScout(score, competitionLevel);
    const autonomousStatus = autoApproved ? "approved" : "rejected";

    // Step 3: Persist to Supabase
    let opportunityId: string | null = null;

    try {
      const db = getSupabaseServer();

      const nowIso = new Date().toISOString();

      const { data: oppRow, error: oppErr } = await db
        .from("opportunities")
        .insert({
          niche: String(opportunity.niche ?? niche),
          market: String(opportunity.market ?? market),
          score,
          demand_signals: (opportunity.demand_signals as string[]) ?? [],
          competition_level: competitionLevel,
          estimated_mrr_potential: String(opportunity.estimated_mrr_potential ?? "$0"),
          recommended_price_point: String(opportunity.recommended_price_point ?? "$0"),
          queen_reasoning: String(opportunity.queen_reasoning ?? ""),
          status: autonomousStatus,
          ...(autoApproved ? { approved_at: nowIso } : {}),
        })
        .select("id")
        .single();

      if (oppErr) console.error("[Scout DB opportunity]", oppErr);
      if (oppRow?.id) opportunityId = oppRow.id;

      // Log to hive
      const { error: logErr } = await db
        .from("hive_log")
        .insert({
          bee: "scout",
          action: autoApproved
            ? `Autonomous approval: ${niche} in ${market} (score ${score})`
            : `Autonomous rejection: ${niche} in ${market} (score ${score})`,
          details: { ...opportunity, opportunity_id: opportunityId, auto_approved: autoApproved },
          status: autoApproved ? "success" : "vetoed",
        })
        .select("id")
        .single();

      if (logErr) console.error("[Scout DB hive_log]", logErr);

    } catch (dbErr) {
      console.error("[Scout DB]", dbErr);
    }

    let builderResult: Record<string, unknown> | null = null;
    if (autoApproved) {
      builderResult = await triggerAutonomousBuilder(req, {
        ...opportunity,
        id: opportunityId,
      }).catch((error) => {
        console.error("[Scout Builder Trigger]", error);
        return null;
      });

      sendHiveUpdate(
        `✅ *Scout autonomous decision*\n${niche} — ${market}\n📊 ${score}/100 · competition: ${competitionLevel}\n🚀 ${builderResult?.launch ? "Campaign launched automatically" : "Builder triggered automatically"}`
      ).catch(console.error);
    } else {
      sendHiveUpdate(
        `🚫 *Scout autonomous reject*\n${niche} — ${market}\n📊 ${score}/100 · competition: ${competitionLevel}\n_No manual approval queue — this niche was rejected automatically._`
      ).catch(console.error);
    }

    return NextResponse.json({
      opportunity,
      opportunityId,
      autoApproved,
      autoRejected: !autoApproved,
      builder: builderResult,
    });
  } catch (error) {
    console.error("[Scout API]", error);
    return NextResponse.json({ error: "Scout Bee encountered an error" }, { status: 500 });
  }
}
