/**
 * CyberHound — Outreach Sequences API
 * Returns follow_up_sequences from Supabase for the Outreach dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const status = searchParams.get("status");

  const db = getSupabaseServer();

  let query = db
    .from("follow_up_sequences")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sequences: data ?? [] });
}
