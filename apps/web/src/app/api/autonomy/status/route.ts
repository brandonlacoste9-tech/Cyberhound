/**
 * GET /api/autonomy/status
 * Simple status for autonomous hive health.
 * Shows counts from key tables + recent activity.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(_req: NextRequest) {
  try {
    const db = getSupabaseServer();
    const [opps, campaigns, tasks, logs] = await Promise.all([
      db.from("opportunities").select("id", { count: "exact", head: true }),
      db.from("campaigns").select("id", { count: "exact", head: true }),
      db.from("agent_tasks").select("id", { count: "exact", head: true }).eq("status", "pending"),
      db
        .from("hive_log")
        .select("bee, action, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const dbError =
      opps.error?.message ||
      campaigns.error?.message ||
      tasks.error?.message ||
      logs.error?.message ||
      null;

    const dbOk = !dbError;
    const autonomousFlag = process.env.AUTONOMOUS_MODE === "true";
    const recent = logs.data ?? [];
    const hasRecentWork = recent.length > 0;

    const status = {
      ok: dbOk,
      timestamp: new Date().toISOString(),
      opportunities: opps.count ?? 0,
      campaigns: campaigns.count ?? 0,
      pending_tasks: tasks.count ?? 0,
      recent_activity: recent,
      autonomous_mode: autonomousFlag,
      db_error: dbError,
      // Honest messaging — do not claim autonomy when DB is dead or idle
      message: !dbOk
        ? `Hive cannot reach database: ${dbError}. Fix Supabase URL/keys and run migrations (see /api/health).`
        : autonomousFlag && hasRecentWork
          ? "Autonomous mode on — recent hive activity present. Monitor /hive."
          : autonomousFlag
            ? "Autonomous mode flag is on, but no recent hive activity. Check cron + LLM balance + /api/health."
            : "Autonomous mode is OFF (set AUTONOMOUS_MODE=true). Crons may still run if CRON_SECRET is set.",
    };

    return NextResponse.json(status, { status: dbOk ? 200 : 503 });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: String(e),
        message: "Hive status check failed — Supabase likely unreachable.",
      },
      { status: 500 }
    );
  }
}
