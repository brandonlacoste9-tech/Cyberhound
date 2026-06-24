/**
 * CyberHound — Environment Validation
 * 
 * Ensures all required API keys and configuration values are present.
 * Logs missing variables to console and hive_log.
 */

import { getSupabaseServer } from "./supabase/server";

export const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DEEPSEEK_API_KEY", // or OPENAI / OPENCLAW
] as const;

export const RECOMMENDED_FOR_FULL_AUTONOMY = [
  "FIRECRAWL_API_KEY",
  "APIFY_API_TOKEN",
  "APOLLO_API_KEY",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "TELEGRAM_BOT_TOKEN",
  "SCHEDULER_SECRET",
] as const;

export async function validateEnv(options: { strict?: boolean; autonomous?: boolean } = {}) {
  const { strict = false, autonomous = false } = options;

  const missing = REQUIRED_ENV_VARS.filter(
    (v) => !process.env[v] || process.env[v] === "placeholder"
  );

  const recommendedMissing = autonomous
    ? RECOMMENDED_FOR_FULL_AUTONOMY.filter(
        (v) => !process.env[v] || process.env[v] === "placeholder"
      )
    : [];

  if (missing.length > 0) {
    const errorMsg = `CRITICAL: Missing required environment variables: ${missing.join(", ")}`;
    console.error(errorMsg);

    try {
      const db = getSupabaseServer();
      await db.from("hive_log").insert({
        bee: "system",
        action: "env_validation",
        status: "failed",
        details: { missing, recommendedMissing, error: errorMsg },
      });
    } catch (e) {
      console.error("Failed to log env validation failure to Supabase:", e);
    }

    return { valid: false, missing, recommendedMissing };
  }

  if (recommendedMissing.length > 0 && autonomous) {
    console.warn(`[autonomous] Missing recommended keys for full autonomy: ${recommendedMissing.join(", ")}`);
  }

  return { valid: true, missing: [], recommendedMissing };
}
