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
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendHiveUpdate, sendHITLApproval } from "@/lib/telegram/notify";

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

// ── Firecrawl / fallback search ────────────────────────────────────────────────

async function search(query: string, limit = 8): Promise<Array<{ url: string; title: string; description: string }>> {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (apiKey && apiKey !== "placeholder" && !apiKey.endsWith("-")) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ query, limit }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.data ?? data.web ?? [];
      }
    } catch { /* fall through */ }
  }

  // DuckDuckGo fallback
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(`https://api.duckduckgo.com/?q=${encoded}&format=json&no_redirect=1&no_html=1`, {
      headers: { "User-Agent": "CyberHound/1.0" },
    });
    const data = await res.json();
    return (data.RelatedTopics ?? []).slice(0, limit).map((t: { FirstURL?: string; Text?: string }) => ({
      url: t.FirstURL ?? "",
      title: t.Text?.split(" - ")[0] ?? "",
      description: t.Text ?? "",
    }));
  } catch {
    return [];
  }
}

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
    const results = await search(q, 8);
    const leads = await extractLeads("upwork", results, niche);
    allLeads.push(...leads);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Churn
  for (const competitor of ANALYST_CONFIG.churn.competitors.slice(0, 2)) {
    const q = `site:g2.com "${competitor}" review "switching" OR "disappointed"`;
    const results = await search(q, 6);
    const leads = await extractLeads("churn", results, competitor);
    allLeads.push(...leads);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Reddit
  for (const kw of ANALYST_CONFIG.reddit.keywords.slice(0, 2)) {
    const sub = ANALYST_CONFIG.reddit.subreddits[Math.floor(Math.random() * ANALYST_CONFIG.reddit.subreddits.length)];
    const q = `site:reddit.com/r/${sub} "${kw}" "recommend" OR "looking for"`;
    const results = await search(q, 6);
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

// ── Main handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET ?? process.env.SCHEDULER_SECRET ?? "cyberhound-scheduler";
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseServer();

  await sendHiveUpdate("🔍 *Analyst Cron Started*\n\nScanning Upwork · Churn · Reddit for warm leads...");

  // 1. Run all three signal modes
  const rawLeads = await runAllModes();

  if (rawLeads.length === 0) {
    await sendHiveUpdate("🔍 *Analyst Cron*: No new leads found this cycle.");
    return NextResponse.json({ leads_found: 0, processed: 0 });
  }

  // 2. Persist all leads (upsert by URL to avoid dupes)
  const toInsert = rawLeads.map((l) => ({
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
  }));

  const { data: saved, error: saveErr } = await db
    .from("analyst_leads")
    .upsert(toInsert, { onConflict: "url", ignoreDuplicates: true })
    .select();

  if (saveErr) console.error("[Analyst Cron] Save error:", saveErr);

  const savedLeads = (saved ?? rawLeads) as Array<Record<string, unknown>>;

  // 3. Focus on high-urgency leads for immediate outreach
  const highUrgency = savedLeads.filter((l) => l.urgency === "high").slice(0, 5);

  await db.from("hive_log").insert({
    bee: "analyst",
    action: `Cron scan — ${rawLeads.length} leads found, ${highUrgency.length} high urgency`,
    details: { total: rawLeads.length, high_urgency: highUrgency.length, sources: ["upwork", "churn", "reddit"] },
    status: rawLeads.length > 0 ? "success" : "idle",
  });

  // 4. For each high-urgency lead, generate outreach sequence + HITL
  let sequencesQueued = 0;

  for (const lead of highUrgency) {
    try {
      const sequence = await generateCloserSequence(lead);
      if (!sequence.length) continue;

      const leadId = lead.id as string | undefined;
      const approvalId = `analyst_${leadId ?? Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      await db.from("outreach_log").insert({
        campaign_id: null,
        sequence,
        status: "pending_approval",
        approval_id: approvalId,
        recipient_count: 1,
        recipients: leadId ? [{ lead_id: leadId, name: lead.contact_name ?? "Decision Maker", email: lead.contact_email ?? "", company: lead.company }] : [],
      });

      await db.from("hive_log").insert({
        bee: "closer",
        action: `Analyst sequence ready: ${lead.company ?? lead.title}`,
        details: { approval_id: approvalId, lead_id: leadId, source: lead.source, signal_type: lead.signal_type, sequence },
        status: "pending_approval",
      });

      if (leadId) {
        await db.from("analyst_leads").update({ status: "queued" }).eq("id", leadId);
      }

      const srcEmoji: Record<string, string> = { upwork: "💼", churn: "🔄", reddit: "🔴" };
      const emoji = srcEmoji[String(lead.source ?? "")] ?? "📡";

      await sendHITLApproval({
        approvalId,
        actionType: "send_outreach_sequence",
        summary: `${emoji} High-urgency lead: ${lead.company ?? lead.title}`,
        details: `📡 Source: ${String(lead.source ?? "").toUpperCase()} — ${lead.signal_type}\n🎯 Pain: ${String(lead.pain_point ?? "").slice(0, 80)}\n🔥 Hook: ${String(lead.personalization_hook ?? "").slice(0, 80)}\n\n📬 Email 1: "${(sequence[0] as Record<string, unknown>)?.subject}"\n📬 Email 2: "${(sequence[1] as Record<string, unknown>)?.subject}" (+3d)\n📬 Email 3: "${(sequence[2] as Record<string, unknown>)?.subject}" (+7d)\n\n⚠️ Approve to send Email 1 now, or veto to skip.`,
      });

      sequencesQueued++;
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      console.error("[Analyst Cron] Closer error:", e);
    }
  }

  const highUrgencyCount = rawLeads.filter((l) => l.urgency === "high").length;
  const summary = rawLeads.slice(0, 3).map((l) => `• ${String(l.title ?? "").slice(0, 55)} [${l.urgency}]`).join("\n");

  await sendHiveUpdate(
    `✅ *Analyst Cron Complete*\n\n📊 Total leads: ${rawLeads.length}\n🔥 High urgency: ${highUrgencyCount}\n📧 Sequences queued: ${sequencesQueued}\n\nTop signals:\n${summary}\n\nReview in /analyst dashboard.`
  );

  return NextResponse.json({
    leads_found: rawLeads.length,
    high_urgency: highUrgencyCount,
    sequences_queued: sequencesQueued,
  });
}
