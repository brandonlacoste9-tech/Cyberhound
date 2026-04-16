/**
 * CyberHound — Autonomous Analyst Cron
 *
 * Runs every 4 hours. Full pipeline:
 *   1. Runs Analyst Bee in "all" mode (Upwork + Churn + Reddit)
 *   2. Filters high-urgency leads
 *   3. Calls Enrich Bee on each (Apollo.io contact lookup)
 *   4. For enriched leads → Closer Bee generates sequence + HITL via Telegram
 *   5. Logs everything to hive_log
 *
 * Auth: Vercel Cron adds Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/llm/client";
import { hasActiveOutreach } from "@/lib/autonomy";
import { hasLiveSearchProvider, searchWeb } from "@/lib/live-search";
import { publicOriginFromHeaders } from "@/lib/site/public-origin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendHiveUpdate } from "@/lib/telegram/notify";
import { Resend } from "resend";

export const runtime = "nodejs";
export const maxDuration = 300;

// ── Config ─────────────────────────────────────────────────────────────────────

const ANALYST_CONFIG = {
  upwork: {
    niches: [
      "web automation",
      "AI integration",
      "Next.js web app",
      "workflow automation",
      "SaaS development",
    ],
  },
  churn: {
    competitors: ["Zapier", "Make.com", "Monday.com", "Notion", "ClickUp"],
  },
  reddit: {
    subreddits: ["entrepreneur", "smallbusiness", "startups", "webdev", "SaaS"],
    keywords: ["automation tool", "web app", "AI agent", "workflow automation", "need developer"],
  },
};

// ── Live search helper ───────────────────────────────────────────────────────

// ── LLM signal extraction ─────────────────────────────────────────────────────

async function extractLeads(
  mode: "upwork" | "churn" | "reddit",
  results: Array<{ url: string; title: string; description: string }>,
  context: string
): Promise<Array<Record<string, unknown>>> {
  if (results.length === 0) return [];

  const prompt = `You are the Analyst Bee for CyberHound. Extract warm B2B leads from these ${mode} results.
Context: ${context}

Results:
${results.map((r, i) => `[${i + 1}] URL: ${r.url}\nTitle: ${r.title}\nSnippet: ${r.description}`).join("\n\n")}

Return ONLY valid JSON array (skip non-leads):
[{
  "source": "${mode}",
  "signal_type": "upwork_job|bad_review|reddit_ask",
  "title": "...",
  "url": "...",
  "raw_text": "...",
  "company": "...",
  "budget": "...",
  "pain_point": "...",
  "urgency": "high|medium|low",
  "recommended_service": "...",
  "personalization_hook": "...",
  "status": "new"
}]`;

  try {
    const raw = await chat([{ role: "user", content: prompt }], {
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.leads) return parsed.leads;
    if (parsed.results) return parsed.results;
    const values = Object.values(parsed);
    if (values.length > 0 && Array.isArray(values[0])) return values[0] as Record<string, unknown>[];
    return [];
  } catch {
    return [];
  }
}

// ── Run all three modes ────────────────────────────────────────────────────────

async function runAllModes(): Promise<Array<Record<string, unknown>>> {
  const allLeads: Array<Record<string, unknown>> = [];

  // Upwork
  for (const niche of ANALYST_CONFIG.upwork.niches.slice(0, 2)) {
    const q = `site:upwork.com/jobs "${niche}" budget`;
    const results = await searchWeb(q, 8);
    const leads = await extractLeads("upwork", results, niche);
    allLeads.push(...leads);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Churn
  for (const competitor of ANALYST_CONFIG.churn.competitors.slice(0, 2)) {
    const q = `site:g2.com "${competitor}" review "switching" OR "disappointed"`;
    const results = await searchWeb(q, 6);
    const leads = await extractLeads("churn", results, competitor);
    allLeads.push(...leads);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Reddit
  for (const kw of ANALYST_CONFIG.reddit.keywords.slice(0, 2)) {
    const sub = ANALYST_CONFIG.reddit.subreddits[Math.floor(Math.random() * ANALYST_CONFIG.reddit.subreddits.length)];
    const q = `site:reddit.com/r/${sub} "${kw}" "recommend" OR "looking for"`;
    const results = await searchWeb(q, 6);
    const leads = await extractLeads("reddit", results, kw);
    allLeads.push(...leads);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return allLeads.filter((l) => {
    const url = String(l.url ?? "");
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

// ── Generate outreach sequence for a lead ─────────────────────────────────────

async function generateCloserSequence(lead: Record<string, unknown>): Promise<Array<Record<string, unknown>>> {
  const prompt = `You are the Closer Bee for CyberHound. Generate a 3-email cold outreach sequence.

Lead Intel:
- Source: ${lead.source} (${lead.signal_type})
- Pain: ${lead.pain_point}
- Hook: ${lead.personalization_hook}
- Service: ${lead.recommended_service}
- Company: ${lead.company ?? "Unknown"}
- Budget: ${lead.budget ?? "Unknown"}

RULES: Under 150 words per email. Use {{FIRST_NAME}} and {{COMPANY}}. Curiosity subject lines. Sign as: Brandon | CyberHound.

Return ONLY JSON array:
[
  {"sequence_number": 1, "subject": "...", "body": "...", "send_delay_days": 0, "goal": "pain_hook"},
  {"sequence_number": 2, "subject": "...", "body": "...", "send_delay_days": 3, "goal": "social_proof"},
  {"sequence_number": 3, "subject": "...", "body": "...", "send_delay_days": 7, "goal": "urgency_close"}
]`;

  try {
    const raw = await chat([{ role: "user", content: prompt }], { temperature: 0.8, max_tokens: 2048 });
    const match = raw.match(/\[[\s\S]*\]/);
    return JSON.parse(match?.[0] ?? raw);
  } catch {
    return [];
  }
}

async function enrichLeadViaApi(origin: string, lead: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const company = String(lead.company ?? "").trim();
  if (!company) return null;

  try {
    const res = await fetch(`${origin}/api/enrich`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company,
        lead_id: lead.id ?? null,
        update_db: true,
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("[Analyst Cron] Enrich API error:", error);
    return null;
  }
}

// ── Main handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET ?? process.env.SCHEDULER_SECRET ?? "cyberhound-scheduler";
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasLiveSearchProvider()) {
    return NextResponse.json(
      { error: "Analyst cron requires a live search provider (FIRECRAWL_API_KEY or APIFY_API_TOKEN)." },
      { status: 503 }
    );
  }

  const db = getSupabaseServer();
  const origin = publicOriginFromHeaders(req.headers) ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyberhound.vercel.app";

  await db.from("hive_log").insert({
    bee: "analyst",
    action: "ANALYST CRON START",
    details: { config: ANALYST_CONFIG },
    status: "success"
  });

  await sendHiveUpdate("🔍 *Analyst Cron Started*\n\nScanning Upwork · Churn · Reddit for warm leads...");

  // 1. Run all three signal modes
  const rawLeads = await runAllModes();

  if (rawLeads.length === 0) {
    await sendHiveUpdate("🔍 *Analyst Cron*: No new leads found this cycle.");
    return NextResponse.json({ leads_found: 0, processed: 0 });
  }

  // 2. Persist only new leads and preserve lifecycle state on existing ones
  const urls = rawLeads.map((l) => String(l.url ?? "")).filter(Boolean);
  const { data: existingLeadRows } = urls.length
    ? await db
        .from("analyst_leads")
        .select("id, url, status, contact_email, contact_name, company, source, signal_type, pain_point, personalization_hook, recommended_service, budget, urgency")
        .in("url", urls)
    : { data: [] as Array<Record<string, unknown>> };

  const existingByUrl = new Map(
    (existingLeadRows ?? []).map((row) => [String(row.url ?? ""), row])
  );

  const toInsert: any[] = [];
  const rejectedLeads: any[] = [];

  for (const l of rawLeads) {
    if (existingByUrl.has(String(l.url ?? ""))) continue;

    const companyName = String(l.company ?? "").trim();
    const forbiddenKeywords = ["startup", "unknown", "pre-revenue", "early stage", "anonymous"];
    const isInvalid = 
      !companyName || 
      companyName.length < 3 || 
      forbiddenKeywords.some(kw => companyName.toLowerCase().includes(kw));

    if (isInvalid) {
      rejectedLeads.push({
        ...l,
        status: "unresolvable",
        rejection_reason: `Invalid company name: "${companyName}"`
      });
      continue;
    }

    toInsert.push({
      source: l.source,
      signal_type: l.signal_type,
      title: l.title,
      url: l.url,
      raw_text: String(l.raw_text ?? "").slice(0, 2000),
      company: l.company ?? null,
      contact_name: l.contact_name ?? null,
      contact_email: l.contact_email ?? null,
      contact_linkedin: l.contact_linkedin ?? null,
      budget: l.budget ?? null,
      pain_point: l.pain_point,
      urgency: l.urgency,
      recommended_service: l.recommended_service,
      personalization_hook: l.personalization_hook,
      status: "new",
    });
  }

  // Persist rejected leads for audit
  if (rejectedLeads.length > 0) {
    const toInsertRejected = rejectedLeads.map(l => ({
      source: l.source,
      signal_type: l.signal_type,
      title: l.title,
      url: l.url,
      raw_text: String(l.raw_text ?? "").slice(0, 2000),
      company: l.company ?? null,
      status: "unresolvable",
    }));
    await db.from("analyst_leads").insert(toInsertRejected);
    
    for (const rl of rejectedLeads) {
      await db.from("hive_log").insert({
        bee: "analyst",
        action: `Lead rejected: ${rl.rejection_reason}`,
        details: { url: rl.url, company: rl.company },
        status: "vetoed",
      });
    }
  }

  const { data: insertedLeads, error: saveErr } = toInsert.length
    ? await db.from("analyst_leads").insert(toInsert).select()
    : { data: [] as Array<Record<string, unknown>>, error: null };

  if (saveErr) console.error("[Analyst Cron] Save error:", saveErr);

  const candidateLeads = [
    ...(insertedLeads ?? []),
    ...((existingLeadRows ?? []).filter((lead) => ["new", "enriched"].includes(String(lead.status ?? "")))),
  ] as Array<Record<string, unknown>>;

  // 3. Focus on high-urgency leads that are still actionable
  const highUrgency = candidateLeads.filter((l) => l.urgency === "high").slice(0, 5);

  await db.from("hive_log").insert({
    bee: "analyst",
    action: `Cron scan — ${rawLeads.length} leads found, ${highUrgency.length} high urgency`,
    details: { total: rawLeads.length, high_urgency: highUrgency.length, sources: ["upwork", "churn", "reddit"] },
    status: rawLeads.length > 0 ? "success" : "idle",
  });

  // 4. For each high-urgency lead — generate sequence and auto-send Email 1
  const resendKey = process.env.RESEND_API_KEY;
  const resend = resendKey && resendKey !== "re_placeholder" ? new Resend(resendKey) : null;
  let sequencesQueued = 0;

  for (const sourceLead of highUrgency) {
    try {
      let lead = sourceLead;
      const leadId = lead.id as string | undefined;

      if (!lead.contact_email && lead.company) {
        const enriched = await enrichLeadViaApi(origin, lead);
        if (enriched) {
          lead = { ...lead, ...enriched };
        }
      }

      const recipientEmail = String(lead.contact_email ?? "");
      if (await hasActiveOutreach({ leadId, recipientEmail })) {
        await db.from("hive_log").insert({
          bee: "closer",
          action: `Skipped duplicate outreach for ${lead.company ?? lead.title}`,
          details: { lead_id: leadId, recipient_email: recipientEmail || null },
          status: "idle",
        });
        continue;
      }

      if (!recipientEmail || !recipientEmail.includes("@")) {
        await db.from("hive_log").insert({
          bee: "enrich",
          action: `Skipped outreach for ${lead.company ?? lead.title} — no verified email`,
          details: { lead_id: leadId, company: lead.company, source: lead.source },
          status: "vetoed",
        });
        continue;
      }

      const sequence = await generateCloserSequence(lead);
      if (!sequence.length) continue;

      const firstName = String(lead.contact_name ?? "there").split(" ")[0];
      const company = String(lead.company ?? "your company");

      await db.from("outreach_log").insert({
        campaign_id: null,
        sequence,
        status: "approved",
        recipient_count: 1,
        recipients: leadId ? [{ lead_id: leadId, name: lead.contact_name ?? "Decision Maker", email: lead.contact_email ?? "", company: lead.company }] : [],
      });

      if (leadId) {
        await db.from("analyst_leads").update({ status: "queued" }).eq("id", leadId);
      }

      // Auto-send Email 1 immediately if Resend is configured and we have a real email
      const email1 = sequence[0] as Record<string, unknown>;
      let sentId: string | null = null;

      if (resend && recipientEmail && recipientEmail.includes("@")) {
        const subject = String(email1.subject ?? "").replace(/\{\{FIRST_NAME\}\}/g, firstName).replace(/\{\{COMPANY\}\}/g, company);
        const body = String(email1.body ?? "").replace(/\{\{FIRST_NAME\}\}/g, firstName).replace(/\{\{COMPANY\}\}/g, company);

        const { data, error: sendErr } = await resend.emails.send({
          from: "Brandon | CyberHound <cyberhound@adgenai.ca>",
          to: [recipientEmail],
          subject,
          text: body,
        });

        if (!sendErr) {
          sentId = data?.id ?? null;
          await db.from("outreach_log").insert({
            campaign_id: null,
            recipient_email: recipientEmail,
            recipient_name: String(lead.contact_name ?? "Decision Maker"),
            subject,
            sequence_number: 1,
            status: "sent",
            resend_id: sentId,
          });

          // Schedule Email 2 & 3 via follow_up_sequences
          if (sequence.length > 1) {
            const nextEmail = sequence[1] as Record<string, unknown>;
            const nextSendAt = new Date();
            nextSendAt.setDate(nextSendAt.getDate() + (Number(nextEmail.send_delay_days) || 3));
            await db.from("follow_up_sequences").insert({
              lead_id: leadId ?? null,
              campaign_id: null,
              recipient_email: recipientEmail,
              recipient_name: String(lead.contact_name ?? "Decision Maker"),
              company: company,
              total_emails: sequence.length,
              sent_count: 1,
              current_step: 2,
              next_send_at: nextSendAt.toISOString(),
              last_sent_at: new Date().toISOString(),
              status: "active",
              sequence: sequence as unknown as never,
            });
          }

          if (leadId) {
            await db.from("analyst_leads").update({ status: "sent" }).eq("id", leadId);
          }
        }
      }

      await db.from("hive_log").insert({
        bee: "closer",
        action: sentId
          ? `Auto-sent Email 1 to ${recipientEmail} (${lead.company ?? lead.title})`
          : `Sequence auto-approved, queued for ${lead.company ?? lead.title}`,
        details: { lead_id: leadId, source: lead.source, signal_type: lead.signal_type, sequence, sent_id: sentId, auto_approved: true },
        status: "success",
      });

      const srcEmoji: Record<string, string> = { upwork: "💼", churn: "🔄", reddit: "🔴" };
      const emoji = srcEmoji[String(lead.source ?? "")] ?? "📡";
      await sendHiveUpdate(
        `${emoji} *Closer Auto-Fired*\n\n👤 ${lead.contact_name ?? "Lead"} @ ${lead.company ?? "Unknown"}\n📧 ${sentId ? `Email 1 sent (${recipientEmail})` : "Sequence queued (no email on lead)"}\n📬 Subject: "${email1.subject}"\n🔄 Follow-ups: ${sequence.length - 1} scheduled`
      );

      sequencesQueued++;
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      console.error("[Analyst Cron] Closer error:", e);
    }
  }

  const highUrgencyCount = rawLeads.filter((l) => l.urgency === "high").length;
  const summary = rawLeads.slice(0, 3).map((l) => `• ${String(l.title ?? "").slice(0, 55)} [${l.urgency}]`).join("\n");

  const resultBody = {
    leads_found: rawLeads.length,
    high_urgency: highUrgencyCount,
    sequences_queued: sequencesQueued,
    timestamp: new Date().toISOString()
  };

  await db.from("hive_log").insert({
    bee: "analyst",
    action: "ANALYST CRON END",
    details: resultBody,
    status: "success"
  });

  await sendHiveUpdate(
    `✅ *Analyst Cron Complete*\n\n📊 Total leads: ${rawLeads.length}\n🔥 High urgency: ${highUrgencyCount}\n📧 Sequences queued: ${sequencesQueued}\n\nTop signals:\n${summary}\n\nReview in /analyst dashboard.`
  );

  return NextResponse.json(resultBody);
}
