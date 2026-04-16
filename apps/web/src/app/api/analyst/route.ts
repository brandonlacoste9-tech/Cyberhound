/**
 * CyberHound — Analyst Bee
 *
 * Three warm-interception signal modes:
 *   upwork  — Scrape Upwork job posts for active budgets in target niches
 *   churn   — Scrape G2/Capterra 1-2 star reviews for competitor churn signals
 *   reddit  — Scrape Reddit posts asking for tool/service recommendations
 *
 * Each mode returns structured leads ready for Apollo enrichment + Closer v2.
 */

import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/llm/client";
import { hasLiveSearchProvider, searchWeb } from "@/lib/live-search";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendHiveUpdate } from "@/lib/telegram/notify";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AnalystLead {
  id?: string;
  source: "upwork" | "churn" | "reddit";
  signal_type: string;
  title: string;
  url: string;
  raw_text: string;
  company?: string;
  contact_name?: string;
  contact_email?: string;
  contact_linkedin?: string;
  budget?: string;
  pain_point: string;
  urgency: "high" | "medium" | "low";
  recommended_service: string;
  personalization_hook: string;
  status: "new" | "enriched" | "queued" | "sent" | "replied";
  created_at?: string;
}

// ── Live search helper ───────────────────────────────────────────────────────

// ── LLM signal extraction ─────────────────────────────────────────────────────

async function extractSignals(
  mode: "upwork" | "churn" | "reddit",
  rawResults: Array<{ url: string; title: string; description: string }>,
  niche: string
): Promise<AnalystLead[]> {
  const systemPrompt = `You are the Analyst Bee for CyberHound, an autonomous revenue generation system.
Your job is to extract high-quality warm leads from search results.
Mode: ${mode}
Niche: ${niche}

For each result, extract:
- Whether it's a genuine buying signal (skip if not)
- The company/person behind it
- Their specific pain point
- Urgency level (high/medium/low)
- Best service to pitch (automation, AI integration, web app, SaaS, etc.)
- A personalization hook (specific detail from their post/review to reference in outreach)

Return ONLY valid JSON array. No markdown, no explanation.`;

  const userPrompt = `Extract warm leads from these ${mode} results for niche: "${niche}":

${rawResults.map((r, i) => `[${i + 1}] URL: ${r.url}\nTitle: ${r.title}\nSnippet: ${r.description}`).join("\n\n")}

Return JSON array of leads:
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
    const response = await chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.3, max_tokens: 3000, response_format: { type: "json_object" } }
    );

    // Handle both array and {leads: [...]} responses
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.leads) return parsed.leads;
    if (parsed.results) return parsed.results;
    // If object with numeric keys
    const values = Object.values(parsed);
    if (values.length > 0 && Array.isArray(values[0])) return values[0] as AnalystLead[];
    return [];
  } catch (e) {
    console.error("[Analyst] LLM parse error:", e);
    return [];
  }
}

// ── Mode: Upwork ──────────────────────────────────────────────────────────────

async function runUpworkMode(niche: string, limit: number): Promise<AnalystLead[]> {
  const queries = [
    `site:upwork.com/jobs "${niche}" budget`,
    `upwork.com job post "${niche}" automation OR "web app" OR "AI" 2025 2026`,
    `upwork freelance project "${niche}" "looking for" developer`,
  ];

  const allResults: Array<{ url: string; title: string; description: string }> = [];
  for (const q of queries) {
    const results = await searchWeb(q, Math.ceil(limit / queries.length));
    allResults.push(...results);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = allResults.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  return extractSignals("upwork", unique.slice(0, limit), niche);
}

// ── Mode: Churn (competitor bad reviews) ─────────────────────────────────────

async function runChurnMode(competitors: string[], limit: number): Promise<AnalystLead[]> {
  const allResults: Array<{ url: string; title: string; description: string }> = [];

  for (const competitor of competitors) {
    const queries = [
      `site:g2.com "${competitor}" review 1 star 2 star "disappointed" OR "switching" OR "cancelled"`,
      `site:capterra.com "${competitor}" review "not worth" OR "switching to" OR "cancelled"`,
      `"${competitor}" review "looking for alternative" OR "switched from" OR "disappointed"`,
    ];
    for (const q of queries) {
      const results = await searchWeb(q, Math.ceil(limit / (competitors.length * queries.length)));
      allResults.push(...results);
    }
  }

  const seen = new Set<string>();
  const unique = allResults.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  return extractSignals("churn", unique.slice(0, limit), competitors.join(", "));
}

// ── Mode: Reddit ──────────────────────────────────────────────────────────────

async function runRedditMode(subreddits: string[], keywords: string[], limit: number): Promise<AnalystLead[]> {
  const allResults: Array<{ url: string; title: string; description: string }> = [];

  for (const sub of subreddits) {
    for (const kw of keywords) {
      const q = `site:reddit.com/r/${sub} "${kw}" "recommend" OR "looking for" OR "anyone use" OR "best tool"`;
      const results = await searchWeb(q, Math.ceil(limit / (subreddits.length * keywords.length)));
      allResults.push(...results);
    }
  }

  const seen = new Set<string>();
  const unique = allResults.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  return extractSignals("reddit", unique.slice(0, limit), keywords.join(", "));
}

// ── Persist leads to Supabase ─────────────────────────────────────────────────

async function persistLeads(leads: AnalystLead[]): Promise<AnalystLead[]> {
  const db = getSupabaseServer();

  const toInsert = leads.map((l) => ({
    source: l.source,
    signal_type: l.signal_type,
    title: l.title,
    url: l.url,
    raw_text: l.raw_text?.slice(0, 2000),
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

  const { data, error } = await db
    .from("analyst_leads")
    .upsert(toInsert, { onConflict: "url", ignoreDuplicates: true })
    .select();

  if (error) {
    console.error("[Analyst] Supabase persist error:", error);
    return leads; // Return original if DB fails
  }

  return (data as AnalystLead[]) ?? leads;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    if (!hasLiveSearchProvider()) {
      return NextResponse.json(
        { error: "Analyst requires a live search provider (FIRECRAWL_API_KEY or APIFY_API_TOKEN)." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const {
      mode,
      // upwork mode
      niche = "OSHA compliance automation",
      // churn mode
      competitors = ["EverSafe", "SafetySync", "Signifyd", "NoFraud"],
      // reddit mode
      subreddits = ["manufacturing", "Shopify", "ecommerce", "safety"],
      keywords = ["OSHA compliance software", "shopify fraud prevention", "chargeback automation"],
      // shared
      limit = 15,
      persist = true,
    } = body;

    if (!mode || !["upwork", "churn", "reddit", "all"].includes(mode)) {
      return NextResponse.json(
        { error: "mode must be: upwork | churn | reddit | all" },
        { status: 400 }
      );
    }

    const db = getSupabaseServer();
    const leads: AnalystLead[] = [];

    // ── Run selected mode(s) ──
    if (mode === "upwork" || mode === "all") {
      const upworkLeads = await runUpworkMode(niche, limit);
      leads.push(...upworkLeads);
    }

    if (mode === "churn" || mode === "all") {
      const churnLeads = await runChurnMode(competitors, limit);
      leads.push(...churnLeads);
    }

    if (mode === "reddit" || mode === "all") {
      const redditLeads = await runRedditMode(subreddits, keywords, limit);
      leads.push(...redditLeads);
    }

    // ── Pre-persistence Filter: Reject ghosts ──
    const qualifiedLeads = leads.filter((l) => {
      const company = l.company?.toLowerCase() || "";
      if (!company || 
          company.includes("startup") || 
          company.includes("unknown") || 
          company.length < 3) {
        return false;
      }
      return true;
    });

    // ── Persist to DB ──
    let savedLeads = qualifiedLeads;
    if (persist && qualifiedLeads.length > 0) {
      savedLeads = await persistLeads(qualifiedLeads);
    }

    // ── Log to hive ──
    await db.from("hive_log").insert({
      bee: "analyst",
      action: `Signal scan [${mode}] — ${leads.length} leads found`,
      details: {
        mode,
        niche,
        competitors,
        subreddits,
        keywords,
        lead_count: leads.length,
      },
      status: leads.length > 0 ? "success" : "idle",
    });

    // ── Telegram HITL notification ──
    if (leads.length > 0) {
      const highUrgency = leads.filter((l) => l.urgency === "high").length;
      const summary = leads
        .slice(0, 3)
        .map((l) => `• ${l.title?.slice(0, 60)} [${l.urgency}]`)
        .join("\n");

      await sendHiveUpdate(
        `🔍 *Analyst Bee Report*\n\nMode: \`${mode}\`\n📊 Leads found: ${leads.length}\n🔥 High urgency: ${highUrgency}\n\nTop signals:\n${summary}\n\n➡️ Review in /analyst dashboard`
      );
    }

    return NextResponse.json({
      mode,
      leads_found: leads.length,
      high_urgency: leads.filter((l) => l.urgency === "high").length,
      leads: savedLeads,
    });
  } catch (error) {
    console.error("[Analyst API]", error);
    return NextResponse.json(
      { error: "Analyst Bee encountered an error", details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "new";
    const source = searchParams.get("source");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    const db = getSupabaseServer();
    let query = db
      .from("analyst_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status !== "all") query = query.eq("status", status);
    if (source) query = query.eq("source", source);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ leads: data ?? [], count: data?.length ?? 0 });
  } catch (error) {
    console.error("[Analyst GET]", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}
