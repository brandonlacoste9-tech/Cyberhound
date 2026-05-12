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
import { hasLiveSearchProvider, searchWeb } from "@/lib/live-search";
import { publicOriginFromHeaders } from "@/lib/site/public-origin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendHiveUpdate } from "@/lib/telegram/notify";

export const runtime = "nodejs";
export const maxDuration = 300;

// ── Config ─────────────────────────────────────────────────────────────────────

const NICHES_PER_RUN = 4;

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

// ── LLM signal extraction ─────────────────────────────────────────────────────

async function extractLeads(
  mode: "upwork" | "churn" | "reddit",
  results: Array<{ url: string; title: string; description: string }>,
  context: string
): Promise<Array<Record<string, unknown>>> {
  if (results.length === 0) return [];

  const prompt = `You are the Analyst Bee, a high-performance signal interceptor in the Cyberhound Neural Workforce.
Your mission: extract high-urgency B2B leads from these ${mode} results.
Context: ${context}

Results:
${results.map((r, i) => `[${i + 1}] URL: ${r.url}\nTitle: ${r.title}\nSnippet: ${r.description}`).join("\n\n")}

RULES:
- Identify "High Urgency" signals: people losing money, active budgets, or extreme pain.
- Filter out "Ghost Leads": anonymous, pre-revenue, or low-quality startups.
- Focus on: Decision makers, specific pain points, and recommended high-ticket services.
- Hook: Create a personalization hook that sounds like institutional intelligence, not a bot.

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
  for (const niche of ANALYST_CONFIG.upwork.niches.slice(0, NICHES_PER_RUN)) {
    const q = `site:upwork.com/jobs "${niche}" budget`;
    const results = await searchWeb(q, 8);
    const leads = await extractLeads("upwork", results, niche);
    allLeads.push(...leads);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Churn
  for (const competitor of ANALYST_CONFIG.churn.competitors.slice(0, NICHES_PER_RUN)) {
    const q = `site:g2.com "${competitor}" review "switching" OR "disappointed"`;
    const results = await searchWeb(q, 6);
    const leads = await extractLeads("churn", results, competitor);
    allLeads.push(...leads);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Reddit
  for (const kw of ANALYST_CONFIG.reddit.keywords.slice(0, NICHES_PER_RUN)) {
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

// Deleted redundant internal enrich/closer logic — now handled by /api/cron/backlog

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

  const toInsert: Record<string, unknown>[] = [];
  const rejectedLeads: Record<string, unknown>[] = [];

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

  // 3. Delegate Enrichment & Outreach to Backlog Processor
  // This ensures high-urgency leads are processed immediately using the unified logic
  try {
    await fetch(`${origin}/api/cron/backlog`, {
      headers: { "Authorization": `Bearer ${cronSecret}` }
    });
  } catch (e) {
    console.error("[Analyst Cron] Failed to trigger backlog:", e);
  }


  const highUrgencyCount = rawLeads.filter((l) => l.urgency === "high").length;
  const summary = rawLeads.slice(0, 3).map((l) => `• ${String(l.title ?? "").slice(0, 55)} [${l.urgency}]`).join("\n");

  const resultBody = {
    leads_found: rawLeads.length,
    high_urgency: highUrgencyCount,
    timestamp: new Date().toISOString()
  };

  await db.from("hive_log").insert({
    bee: "analyst",
    action: "ANALYST CRON END",
    details: resultBody,
    status: "success"
  });

  await sendHiveUpdate(
    `✅ *Analyst Cron Complete*\n\n📊 Total leads: ${rawLeads.length}\n🔥 High urgency: ${highUrgencyCount}\n\nTop signals:\n${summary}\n\n_Unified Backlog Processor triggered for enrichment & outreach._`
  );

  return NextResponse.json(resultBody);
}
