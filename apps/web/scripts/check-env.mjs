/**
 * Validates apps/web/.env.local for production-style completeness.
 * Does not print secret values. Exit 1 only on missing required core vars.
 *
 *   pnpm run check:env
 *   pnpm run check:env -- --strict   # also warn-as-error for LLM + site URL
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
const strict = process.argv.includes("--strict");

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

const issues = [];
for (const [key, label] of required) {
  if (!ok(env[key])) issues.push({ level: "error", msg: `Missing ${key} (${label})` });
}
for (const [key, label] of requiredService) {
  if (!ok(env[key])) issues.push({ level: "error", msg: `Missing ${key} (${label})` });
}

if (strict) {
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

const optionalHints = [
  ["FIRECRAWL_API_KEY", "Scout/Analyst web intelligence"],
  ["STRIPE_SECRET_KEY", "Builder Stripe + Treasurer"],
  ["TELEGRAM_BOT_TOKEN", "HITL alerts"],
  ["TELEGRAM_CHAT_ID", "HITL chat destination (same as webhook admin)"],
  ["RESEND_API_KEY", "Closer/scheduler email"],
  ["APOLLO_API_KEY", "Enrich bee"],
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
if (!strict) console.log("Tip: run with --strict before release for LLM + NEXT_PUBLIC_SITE_URL.");
