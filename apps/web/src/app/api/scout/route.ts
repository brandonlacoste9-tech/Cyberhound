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
      action: `Scout dispatched for niche: ${niche}`,
      details: { market, niche, method: "hermes_async" },
      status: "success",
    });

    // 1. Insert a pending row into opportunities so the UI sees it
    const { data: oppRow, error: oppErr } = await db
      .from("opportunities")
      .insert({
        niche: String(niche),
        market: String(market),
        score: 0,
        demand_signals: ["Agent dispatched..."],
        competition_level: "medium",
        estimated_mrr_potential: "Calculating...",
        recommended_price_point: "Calculating...",
        queen_reasoning: "Hermes Agent has been dispatched to perform deep research...",
        status: "discovered",
      })
      .select("id")
      .single();

    if (oppErr || !oppRow) {
      console.error("[Scout DB opportunity]", oppErr);
      return NextResponse.json({ error: "Failed to create pending opportunity" }, { status: 500 });
    }

    // 2. Queue the task in agent_tasks for the local Hermes Agent
    const { error: taskErr } = await db
      .from("agent_tasks")
      .insert({
        task_type: "scout_research",
        payload: { niche, market, opportunity_id: oppRow.id }
      });

    if (taskErr) {
      console.error("[Scout DB task]", taskErr);
    }

    // Send telegram update
    sendHiveUpdate(`🔍 *Scout Dispatched (Hermes)*\n${niche} — ${market}`).catch(console.error);

    return NextResponse.json({
      opportunity: { id: oppRow.id, niche, market, status: "discovered" },
      opportunityId: oppRow.id,
      autoApproved: false,
      autoRejected: false,
      builder: null,
    });
  } catch (error) {
    console.error("[Scout API]", error);
    return NextResponse.json({ error: "Scout Bee encountered an error" }, { status: 500 });
  }
}
