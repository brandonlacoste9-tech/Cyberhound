/**
 * GET /api/health — honest colony diagnostics (no fake "online" badges).
 */
import { NextResponse } from "next/server";
import { configuredProviders } from "@/lib/llm/client";
import { hasLiveSearchProvider, hasPaidSearchProvider } from "@/lib/live-search";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasKey(name: string): boolean {
  const v = process.env[name]?.trim();
  return !!v && v !== "placeholder" && !v.endsWith("-");
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const checks: Record<string, unknown> = {
    ok: false,
    timestamp: new Date().toISOString(),
    site: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    autonomous_mode: process.env.AUTONOMOUS_MODE === "true",
  };

  // Supabase DNS + simple query
  let dbOk = false;
  let dbError: string | null = null;
  let counts: Record<string, number | null> = {
    opportunities: null,
    campaigns: null,
    hive_log: null,
    leads: null,
  };

  if (!supabaseUrl) {
    dbError = "NEXT_PUBLIC_SUPABASE_URL missing";
  } else {
    try {
      const host = new URL(supabaseUrl).hostname;
      checks.supabase_host = host;
      const db = getSupabaseServer();
      const [opps, camps, logs, leads] = await Promise.all([
        db.from("opportunities").select("id", { count: "exact", head: true }),
        db.from("campaigns").select("id", { count: "exact", head: true }),
        db.from("hive_log").select("id", { count: "exact", head: true }),
        db.from("leads").select("id", { count: "exact", head: true }),
      ]);

      const firstErr =
        opps.error?.message ||
        camps.error?.message ||
        logs.error?.message ||
        leads.error?.message;

      if (firstErr) {
        dbError = firstErr;
        // still record partial counts
      } else {
        dbOk = true;
      }
      counts = {
        opportunities: opps.count ?? 0,
        campaigns: camps.count ?? 0,
        hive_log: logs.count ?? 0,
        leads: leads.count ?? 0,
      };
    } catch (e) {
      dbError = e instanceof Error ? e.message : String(e);
      if (dbError.includes("ENOTFOUND") || dbError.includes("getaddrinfo")) {
        dbError = `Supabase host unreachable (DNS). Project deleted/paused? URL=${supabaseUrl}`;
      }
    }
  }

  const llmProviders = configuredProviders();
  const llmOk = llmProviders.length > 0;
  const searchOk = hasLiveSearchProvider();
  const paidSearch = hasPaidSearchProvider();
  const stripeOk = hasKey("STRIPE_SECRET_KEY") && process.env.STRIPE_SECRET_KEY!.startsWith("sk_");
  const emailOk = hasKey("RESEND_API_KEY");
  const telegramOk = hasKey("TELEGRAM_BOT_TOKEN") && hasKey("TELEGRAM_CHAT_ID");

  const blockers: string[] = [];
  if (!dbOk) blockers.push(`database: ${dbError ?? "unknown"}`);
  if (!llmOk) blockers.push("llm: no provider keys configured");

  checks.database = { ok: dbOk, error: dbError, counts };
  checks.llm = {
    ok: llmOk,
    providers: llmProviders,
    note: llmProviders.includes("deepseek")
      ? "DeepSeek is configured — if hunt logs show 402, top up balance or set GEMINI/OPENAI/Ollama"
      : null,
  };
  checks.search = {
    ok: searchOk,
    paid: paidSearch,
    note: paidSearch
      ? "Firecrawl/Apify configured"
      : "Using free DuckDuckGo fallback — set FIRECRAWL_API_KEY for higher-quality hunt signals",
  };
  checks.stripe = { ok: stripeOk };
  checks.email = { ok: emailOk };
  checks.telegram = { ok: telegramOk };
  checks.blockers = blockers;
  checks.ok = dbOk && llmOk;
  checks.ready_for_autonomous_hunt = dbOk && llmOk && searchOk;
  checks.message = blockers.length
    ? `Colony blocked: ${blockers.join(" · ")}`
    : paidSearch
      ? "Colony infrastructure OK — run /api/cron/hunt with CRON_SECRET to scout"
      : "Colony OK with free search fallback — add FIRECRAWL_API_KEY for premium hunt intel";

  return NextResponse.json(checks, { status: checks.ok ? 200 : 503 });
}
