/**
 * CyberHound — Unified Dashboard API
 * 
 * Aggregates all high-level stats and logs for the Overlord Dashboard.
 * Uses Service Role to bypass RLS for institutional internal visibility.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const db = getSupabaseServer();
  const fetchStart = Date.now();

  try {
    // 1. Hive Logs (Recent Activity)
    const { data: hiveLogs } = await db
      .from("hive_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);

    // 2. Stats (MRR, Active Swarms, Total Leads)
    const { data: campaigns } = await db
      .from("campaigns")
      .select("mrr, status");
    
    const mrr = campaigns?.reduce((acc, curr) => acc + (curr.mrr || 0), 0) || 0;
    const activeSwarms = campaigns?.filter(c => c.status === 'live').length || 0;
    
    const { count: leadCount } = await db
      .from("analyst_leads")
      .select("*", { count: 'exact', head: true });

    // 3. Neural load — real: % of leads actively in the enrichment/outreach pipeline
    const { count: pipelineLeadCount } = await db
      .from("analyst_leads")
      .select("*", { count: "exact", head: true })
      .in("status", ["enriched", "queued"]);

    const totalLeads = leadCount ?? 0;
    const pipelineLeads = pipelineLeadCount ?? 0;
    const neural_load = totalLeads > 0
      ? `${Math.min(100, Math.round((pipelineLeads / totalLeads) * 100))}%`
      : "0%";

    // 4. Live bee activity — last status per bee in the past 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: beeActivity } = await db
      .from("hive_log")
      .select("bee, status, created_at")
      .gte("created_at", sixHoursAgo)
      .order("created_at", { ascending: false })
      .limit(100);

    const bee_status: Record<string, { status: string; last_seen: string }> = {};
    for (const entry of (beeActivity ?? [])) {
      const key = String(entry.bee);
      if (!bee_status[key]) {
        bee_status[key] = { status: String(entry.status), last_seen: String(entry.created_at) };
      }
    }

    const fetchMs = Date.now() - fetchStart;

    return NextResponse.json({
      logs: hiveLogs || [],
      stats: {
        mrr,
        active_swarms: activeSwarms,
        total_leads: totalLeads,
        pipeline_leads: pipelineLeads,
        neural_load,
      },
      bee_status,
      fetch_ms: fetchMs,
    });
  } catch (error) {
    console.error("[Dashboard API] Error:", error);
    return NextResponse.json({ error: "Failed to aggregate dashboard data" }, { status: 500 });
  }
}
