/**
 * GET /api/autonomy/status
 * Simple status for autonomous hive health.
 * Shows counts from key tables + recent activity.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const db = getSupabaseServer();

  try {
    const [opps, campaigns, tasks, logs] = await Promise.all([
      db.from("opportunities").select("id", { count: "exact" }),
      db.from("campaigns").select("id", { count: "exact" }),
      db.from("agent_tasks").select("id", { count: "exact" }).eq("status", "pending"),
      db.from("hive_log").select("bee, action, status, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

    const status = {
      ok: true,
      timestamp: new Date().toISOString(),
      opportunities: opps.count ?? 0,
      campaigns: campaigns.count ?? 0,
      pending_tasks: tasks.count ?? 0,
      recent_activity: logs.data ?? [],
      autonomous_mode: process.env.AUTONOMOUS_MODE === "true",
      message: "Hive is running autonomously. Monitor via /dashboard/hive",
    };

    return NextResponse.json(status);
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
