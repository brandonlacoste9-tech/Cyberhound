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

export async function GET(req: NextRequest) {
  const db = getSupabaseServer();

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

    return NextResponse.json({
      logs: hiveLogs || [],
      stats: {
        mrr,
        active_swarms: activeSwarms,
        total_leads: leadCount || 0,
        neural_load: "14%" // Hardcoded for aesthetics as per original design
      }
    });
  } catch (error) {
    console.error("[Dashboard API] Error:", error);
    return NextResponse.json({ error: "Failed to aggregate dashboard data" }, { status: 500 });
  }
}
