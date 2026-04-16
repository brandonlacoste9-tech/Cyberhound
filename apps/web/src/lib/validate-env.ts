/**
 * CyberHound — Environment Validation
 * 
 * Ensures all required API keys and configuration values are present.
 * Logs missing variables to console and hive_log.
 */

import { getSupabaseServer } from "./supabase/server";

export const REQUIRED_ENV_VARS = [
  "APIFY_API_TOKEN",
  "HUNTER_API_KEY",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DEEPSEEK_API_KEY",
  "TELEGRAM_BOT_TOKEN",
] as const;

export async function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v] || process.env[v] === "placeholder");
  
  if (missing.length > 0) {
    const errorMsg = `CRITICAL: Missing required environment variables: ${missing.join(", ")}`;
    console.error(errorMsg);
    
    try {
      const db = getSupabaseServer();
      await db.from("hive_log").insert({
        bee: "system",
        action: "env_validation",
        status: "failed",
        details: { missing, error: errorMsg },
      });
    } catch (e) {
      console.error("Failed to log env validation failure to Supabase:", e);
    }
    
    return { valid: false, missing };
  }
  
  return { valid: true, missing: [] };
}
