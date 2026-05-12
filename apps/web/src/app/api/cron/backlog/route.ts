/**
 * CyberHound — Backlog Processor Cron
 * 
 * Clears the lead backlog by:
 * 1. Enriching 'new' leads (Apollo/Hunter)
 * 2. Starting outreach for 'enriched' leads (Closer Bee)
 * 
 * Runs every hour to ensure steady throughput.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { publicOriginFromHeaders } from "@/lib/site/public-origin";
import { sendHiveUpdate } from "@/lib/telegram/notify";

export const runtime = "nodejs";
export const maxDuration = 300; 

const BATCH_SIZE = 25;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET ?? process.env.SCHEDULER_SECRET ?? "cyberhound-scheduler";
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseServer();
  const origin = publicOriginFromHeaders(req.headers) ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyberhound.vercel.app";

  await db.from("hive_log").insert({
    bee: "backlog_processor",
    action: "BACKLOG SCAN START",
    status: "success"
  });

  // ── 1. ENRICHMENT BACKLOG ──
  const { data: newLeads } = await db
    .from("analyst_leads")
    .select("id, company, url")
    .eq("status", "new")
    .limit(BATCH_SIZE);

  let enrichedCount = 0;
  if (newLeads && newLeads.length > 0) {
    try {
      const res = await fetch(`${origin}/api/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: newLeads, update_db: true }),
      });
      const data = await res.json();
      enrichedCount = data.enriched || 0;
    } catch (e) {
      console.error("[Backlog Cron] Enrichment error:", e);
    }
  }

  // ── 2. CLOSER BACKLOG ──
  const { data: readyLeads } = await db
    .from("analyst_leads")
    .select("id, contact_email, status")
    .eq("status", "enriched")
    .not("contact_email", "is", null)
    .limit(BATCH_SIZE);

  let outreachCount = 0;
  if (readyLeads && readyLeads.length > 0) {
    for (const lead of readyLeads) {
      try {
        const res = await fetch(`${origin}/api/closer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "from_lead", lead_id: lead.id }),
        });
        const data = await res.json();
        if (data.sent) outreachCount++;
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error("[Backlog Cron] Closer error:", e);
      }
    }
  }

  const resultBody = {
    enriched: enrichedCount,
    outreach_started: outreachCount,
    backlog_remaining: (newLeads?.length || 0) + (readyLeads?.length || 0),
    timestamp: new Date().toISOString()
  };

  await db.from("hive_log").insert({
    bee: "backlog_processor",
    action: `Processed ${enrichedCount} enrichments and ${outreachCount} outreach starts`,
    details: resultBody,
    status: "success"
  });

  if (enrichedCount > 0 || outreachCount > 0) {
    await sendHiveUpdate(
      `⚙️ *Backlog Processor Complete*\n\n🔬 Enriched: ${enrichedCount}\n📧 Outreach Started: ${outreachCount}\n\nPipeline is flowing again. Clearing the 733 lead backlog...`
    );
  }

  return NextResponse.json(resultBody);
}
