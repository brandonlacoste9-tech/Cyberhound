/**
 * CyberHound — Vigil Monitor (Self-Healing & Pipeline Guard)
 *
 * Runs every hour (or more frequent).
 * Mission:
 *   1. Find "stuck" leads (new -> enriched -> queued -> sent).
 *   2. Self-heal missing enrichment for high-urgency leads.
 *   3. Auto-strike leads that are ready but stalled.
 *   4. Monitor for stalled sequences.
 *   5. Log "Neural Workforce" health metrics to hive_log.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendHiveUpdate } from "@/lib/telegram/notify";
import { publicOriginFromHeaders } from "@/lib/site/public-origin";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET ?? process.env.SCHEDULER_SECRET ?? "cyberhound-scheduler";
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseServer();
  const origin = publicOriginFromHeaders(req.headers) ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyberhound.vercel.app";
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  await db.from("hive_log").insert({
    bee: "vigil",
    action: "VIGIL MONITOR START",
    status: "success"
  });

  // ── 1. Audit: Stuck New Leads (Need Enrichment) ──
  const { data: stuckNewLeads } = await db
    .from("analyst_leads")
    .select("id, company, status, urgency, created_at")
    .eq("status", "new")
    .lt("created_at", oneHourAgo)
    .eq("urgency", "high")
    .limit(10);

  let enrichmentHealed = 0;
  if (stuckNewLeads && stuckNewLeads.length > 0) {
    for (const lead of stuckNewLeads) {
      if (!lead.company) continue;
      
      try {
        const res = await fetch(`${origin}/api/enrich`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: lead.company,
            lead_id: lead.id,
            update_db: true,
          }),
        });
        if (res.ok) enrichmentHealed++;
      } catch (e) {
        console.error("[Vigil] Enrichment healing error:", e);
      }
    }
  }

  // ── 2. Audit: Stuck Enriched Leads (Need Closer) ──
  // Leads that are enriched but not yet queued/sent
  const { data: stuckEnrichedLeads } = await db
    .from("analyst_leads")
    .select("id, company, status, urgency, contact_email, updated_at")
    .eq("status", "enriched")
    .lt("updated_at", oneHourAgo)
    .limit(10);

  let closerHealed = 0;
  if (stuckEnrichedLeads && stuckEnrichedLeads.length > 0) {
    // We can't easily "trigger" the closer cron for specific leads without logic duplication
    // or adding a specific "strike" API. For now, we'll just log them as "needing attention".
    // Future: Call a /api/closer/strike endpoint.
    closerHealed = stuckEnrichedLeads.length;
  }

  // ── 3. Audit: Stalled Sequences ──
  const { data: stalledSequences } = await db
    .from("follow_up_sequences")
    .select("id, recipient_email, status, next_send_at")
    .eq("status", "active")
    .lt("next_send_at", oneHourAgo)
    .limit(10);

  // ── 4. Audit: Stalled Agent Tasks (Hermes health) ──
  const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
  const { data: stalledTasks } = await db
    .from("agent_tasks")
    .select("id, task_type, status")
    .eq("status", "pending")
    .lt("created_at", thirtyMinsAgo)
    .limit(10);

  // ── 5. Neural Workforce Health ──
  const { count: totalLeads } = await db.from("analyst_leads").select("*", { count: "exact", head: true });
  const { count: activeSequences } = await db.from("follow_up_sequences").select("*", { count: "exact", head: true }).eq("status", "active");

  const healthReport = {
    total_leads: totalLeads ?? 0,
    active_sequences: activeSequences ?? 0,
    stuck_new_leads: stuckNewLeads?.length ?? 0,
    enrichment_healed: enrichmentHealed,
    stuck_enriched_leads: closerHealed,
    stalled_sequences: stalledSequences?.length ?? 0,
    stalled_tasks: stalledTasks?.length ?? 0,
    timestamp: now.toISOString(),
  };

  await db.from("hive_log").insert({
    bee: "vigil",
    action: "VIGIL HEALTH CHECK",
    details: healthReport,
    status: (stuckNewLeads?.length || stalledSequences?.length || stalledTasks?.length) ? "warning" : "success"
  });

  // Telegram Alert if issues found
  if (healthReport.stuck_new_leads > 0 || healthReport.stalled_sequences > 0 || healthReport.stalled_tasks > 0) {
    await sendHiveUpdate(
      `🛡️ *Vigil Monitor Alert*\n\n` +
      `⚠️ Stuck Leads (High): ${healthReport.stuck_new_leads}\n` +
      `🩹 Enrichment Healed: ${healthReport.enrichment_healed}\n` +
      `⏳ Stalled Sequences: ${healthReport.stalled_sequences}\n` +
      `🤖 Stalled Tasks: ${healthReport.stalled_tasks} (Hermes worker?)\n\n` +
      `*Neural Workforce* is active but needs minor recalibration.`
    );
  }

  return NextResponse.json(healthReport);
}
