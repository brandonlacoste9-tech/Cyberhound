import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET ?? process.env.SCHEDULER_SECRET ?? "cyberhound-scheduler";
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getSupabaseServer();

    // 1. Delete all assets
    await db.from("assets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    
    // 2. Delete all campaigns
    await db.from("campaigns").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 3. Delete all outreach logs
    await db.from("outreach_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 4. Delete all opportunities
    await db.from("opportunities").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 5. Delete all analyst leads
    await db.from("analyst_leads").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 6. Delete all hive logs
    await db.from("hive_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    return NextResponse.json({ success: true, message: "Database purged of all legacy data." });
  } catch (error) {
    console.error("[Purge API]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
