/**
 * CyberHound — Outreach Log API
 * Returns outreach_log entries from Supabase for the Outreach dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const status = searchParams.get("status");
  const campaignId = searchParams.get("campaign_id");

  const db = getSupabaseServer();

  let query = db
    .from("outreach_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (campaignId) {
    query = query.eq("campaign_id", campaignId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ log: data ?? [], entries: data ?? [] });
}
