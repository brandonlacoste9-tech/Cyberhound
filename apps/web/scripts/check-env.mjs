/**
 * Validates apps/web/.env.local for production-style completeness.
 * Does not print secret values. Exit 1 only on missing required core vars.
 *
 *   pnpm run check:env
 *   pnpm run check:env -- --strict       # also warn-as-error for LLM + site URL
 *   pnpm run check:env -- --autonomous   # require full autonomous production stack
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
const strict = process.argv.includes("--strict");
const autonomous = process.argv.includes("--autonomous");

if (!fs.existsSync(envPath) && process.env.CI === "true") {
  console.log("check-env: skipped (no apps/web/.env.local in CI — inject vars in host instead)");
  process.exit(0);
}

function loadEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function ok(v) {
  return typeof v === "string" && v.length > 0 && !/^placeholder$/i.test(v) && v !== "sk_test_placeholder";
}

const env = loadEnvFile(envPath);

if (!fs.existsSync(envPath)) {
  console.error("Missing apps/web/.env.local — copy apps/web/.env.local.example and fill values.");
  process.exit(1);
}

const required = [
  ["NEXT_PUBLIC_SUPABASE_URL", "Supabase project URL"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase anon key (public)"],
];

const requiredService = [["SUPABASE_SERVICE_ROLE_KEY", "Supabase service role (server-only)"]];

const llmOk =
  ok(env.DEEPSEEK_API_KEY) ||
  ok(env.OPENAI_API_KEY) ||
  (ok(env.OPENCLAW_BASE_URL) && ok(env.OPENCLAW_GATEWAY_TOKEN));

const liveSearchOk = ok(env.FIRECRAWL_API_KEY) || ok(env.APIFY_API_TOKEN) || ok(env.APIFY_API_KEY);

const issues = [];
for (const [key, label] of required) {
  if (!ok(env[key])) issues.push({ level: "error", msg: `Missing ${key} (${label})` });
}
for (const [key, label] of requiredService) {
  if (!ok(env[key])) issues.push({ level: "error", msg: `Missing ${key} (${label})` });
}

if (strict || autonomous) {
  if (!ok(env.NEXT_PUBLIC_SITE_URL))
    issues.push({ level: "error", msg: "Missing NEXT_PUBLIC_SITE_URL (needed for correct landing_page_url in prod)" });
  if (!llmOk)
    issues.push({
      level: "error",
      msg: "No LLM configured: set DEEPSEEK_API_KEY and/or OPENAI_API_KEY, or OPENCLAW_* for gateway",
    });
} else {
  if (!ok(env.NEXT_PUBLIC_SITE_URL))
    issues.push({
      level: "warn",
      msg: "NEXT_PUBLIC_SITE_URL unset — Vercel can use VERCEL_URL; set explicitly for stable Builder URLs",
    });
  if (!llmOk)
    issues.push({
      level: "warn",
      msg: "No LLM key detected — Queen/Scout/Builder APIs will fail until DEEPSEEK_API_KEY (or OpenAI/OpenClaw) is set",
    });
}

if (autonomous) {
  const autonomousRequired = [
    ["FIRECRAWL_API_KEY|APIFY_API_TOKEN|APIFY_API_KEY", "Live search provider for Scout/Analyst"],
    ["RESEND_API_KEY", "Closer + Scheduler autonomous email delivery"],
    ["APOLLO_API_KEY", "Enrich bee real contact data"],
    ["STRIPE_SECRET_KEY", "Builder autonomous monetization"],
    ["CRON_SECRET|SCHEDULER_SECRET", "Protected Vercel cron execution"],
  ];

  if (!liveSearchOk) {
    issues.push({
      level: "error",
      msg: "No live search provider configured: set FIRECRAWL_API_KEY or APIFY_API_TOKEN/APIFY_API_KEY",
    });
  }
  if (!ok(env.RESEND_API_KEY)) {
    issues.push({ level: "error", msg: "Missing RESEND_API_KEY (autonomous outreach delivery)" });
  }
  if (!ok(env.APOLLO_API_KEY)) {
    issues.push({ level: "error", msg: "Missing APOLLO_API_KEY (real contact enrichment)" });
  }
  if (!ok(env.STRIPE_SECRET_KEY)) {
    issues.push({ level: "error", msg: "Missing STRIPE_SECRET_KEY (autonomous launch + monetization)" });
  }
  if (!(ok(env.CRON_SECRET) || ok(env.SCHEDULER_SECRET))) {
    issues.push({ level: "error", msg: "Missing CRON_SECRET or SCHEDULER_SECRET (cron auth)" });
  }

  for (const [key, hint] of autonomousRequired) {
    if (key.includes("|") || ok(env[key])) continue;
    console.log(`  (autonomous) ${key} — ${hint}`);
  }
}

const optionalHints = [
  ["FIRECRAWL_API_KEY", "Scout/Analyst web intelligence"],
  ["APIFY_API_TOKEN", "Scout/Analyst live search fallback"],
  ["STRIPE_SECRET_KEY", "Builder Stripe + Treasurer"],
  ["TELEGRAM_BOT_TOKEN", "Telegram telemetry / control"],
  ["TELEGRAM_CHAT_ID", "Telegram destination"],
  ["RESEND_API_KEY", "Closer/scheduler email"],
  ["APOLLO_API_KEY", "Enrich bee"],
  ["CRON_SECRET", "Vercel cron authorization"],
];

for (const [key, hint] of optionalHints) {
  if (!ok(env[key])) console.log(`  (optional) ${key} — ${hint}`);
}

for (const i of issues.filter((x) => x.level === "warn")) console.warn("WARN:", i.msg);
for (const i of issues.filter((x) => x.level === "error")) console.error("ERROR:", i.msg);

const hasErrors = issues.some((x) => x.level === "error");
if (hasErrors) {
  console.error("\ncheck-env failed. Fix .env.local or use --strict only in CI when vars are injected differently.");
  process.exit(1);
}

console.log("check-env: core Supabase variables present.");
if (autonomous) {
  console.log("Autonomous mode check complete.");
} else if (!strict) {
  console.log("Tip: run with --strict before release and --autonomous before enabling full autonomous mode.");
}
