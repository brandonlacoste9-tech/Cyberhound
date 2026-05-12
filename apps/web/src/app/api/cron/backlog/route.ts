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

  // Guard: if no enrichment API is configured, skip enrichment step
  const canEnrich = !!(
    (process.env.APOLLO_API_KEY && process.env.APOLLO_API_KEY !== "placeholder") ||
    (process.env.HUNTER_API_KEY && process.env.HUNTER_API_KEY !== "placeholder")
  );

  // ── 1. ENRICHMENT BACKLOG ──
  const { data: newLeads } = await db
    .from("analyst_leads")
    .select("id, company, url")
    .eq("status", "new")
    .not("company", "is", null)
    .limit(BATCH_SIZE);

  let enrichedCount = 0;
  if (canEnrich && newLeads && newLeads.length > 0) {
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
  } else if (!canEnrich) {
    console.warn("[Backlog Cron] No enrichment API key configured — skipping enrichment step.");
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
        // Count as success if email sent OR sequence was queued (no Resend key)
        if (data.sent || data.sequence) outreachCount++;
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error("[Backlog Cron] Closer error:", e);
      }
    }
  }

  // Fetch true remaining counts (post-processing snapshot)
  const { count: remainingNew } = await db
    .from("analyst_leads")
    .select("*", { count: "exact", head: true })
    .eq("status", "new");
  const { count: remainingEnriched } = await db
    .from("analyst_leads")
    .select("*", { count: "exact", head: true })
    .eq("status", "enriched");

  const resultBody = {
    enriched: enrichedCount,
    outreach_started: outreachCount,
    backlog_remaining: (remainingNew ?? 0) + (remainingEnriched ?? 0),
    new_leads_remaining: remainingNew ?? 0,
    enriched_leads_remaining: remainingEnriched ?? 0,
    timestamp: new Date().toISOString()
  };

  await db.from("hive_log").insert({
    bee: "backlog_processor",
    action: `Processed ${enrichedCount} enrichments and ${outreachCount} outreach starts`,
    details: resultBody,
    status: "success"
  });

  if (enrichedCount > 0 || outreachCount > 0 || resultBody.backlog_remaining > 0) {
    await sendHiveUpdate(
      `⚙️ *Backlog Processor Complete*\n\n🔬 Enriched: ${enrichedCount}\n📧 Outreach Started: ${outreachCount}\n📦 Backlog remaining: ${resultBody.backlog_remaining} (${resultBody.new_leads_remaining} new · ${resultBody.enriched_leads_remaining} enriched)\n🔑 Enrich API: ${canEnrich ? "✅ configured" : "❌ no API key"}`
    );
  }

  return NextResponse.json(resultBody);
}
