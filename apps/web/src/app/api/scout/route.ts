import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendHiveUpdate } from "@/lib/telegram/notify";

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
