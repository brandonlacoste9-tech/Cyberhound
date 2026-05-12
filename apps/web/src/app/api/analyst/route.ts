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
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function extractLeads(
  mode: "upwork" | "churn" | "reddit",
  results: Array<{ url: string; title: string; description: string }>,
  context: string
): Promise<AnalystLead[]> {
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
    const leads = Array.isArray(parsed) ? parsed : (parsed.leads || parsed.results || []);
    return leads as AnalystLead[];
  } catch {
    return [];
  }
}

async function runUpworkMode(niche: string, limit: number): Promise<AnalystLead[]> {
  const q = `site:upwork.com/jobs "${niche}" budget`;
  const results = await searchWeb(q, limit);
  return extractLeads("upwork", results, niche);
}

async function runChurnMode(competitors: string[], limit: number): Promise<AnalystLead[]> {
  const comp = competitors[Math.floor(Math.random() * competitors.length)];
  const q = `site:g2.com "${comp}" review "switching" OR "disappointed"`;
  const results = await searchWeb(q, limit);
  return extractLeads("churn", results, comp);
}

async function runRedditMode(subreddits: string[], keywords: string[], limit: number): Promise<AnalystLead[]> {
  const sub = subreddits[Math.floor(Math.random() * subreddits.length)];
  const kw = keywords[Math.floor(Math.random() * keywords.length)];
  const q = `site:reddit.com/r/${sub} "${kw}" "recommend" OR "looking for"`;
  const results = await searchWeb(q, limit);
  return extractLeads("reddit", results, `${sub} - ${kw}`);
}

async function persistLeads(leads: AnalystLead[]): Promise<AnalystLead[]> {
  const db = getSupabaseServer();
  const { data, error } = await db.from("analyst_leads").insert(leads).select();
  if (error) {
    console.error("[Analyst Persist Error]", error);
    return leads;
  }
  return (data || []) as AnalystLead[];
}

// ── Main handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { 
      mode = "all", 
      niche = "SaaS development", 
      competitors = ["Zapier", "Make.com"],
      subreddits = ["SaaS", "startups"],
      keywords = ["automation"],
      limit = 10,
      persist = true
    } = await req.json();

    if (!hasLiveSearchProvider()) {
      return NextResponse.json({ error: "No live search provider configured." }, { status: 503 });
    }

    const db = getSupabaseServer();
    const leads: AnalystLead[] = [];

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
