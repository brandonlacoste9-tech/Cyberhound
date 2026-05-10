import { createClient } from "@supabase/supabase-js";

function requirePublicSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for server Supabase client."
    );
  }
  return { url, anonKey };
}

/**
 * Server-side Supabase client using the service role key.
 * Only use in API routes — never expose to the client.
 */
export function getSupabaseServer() {
  const { url, anonKey } = requirePublicSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? anonKey;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/** Anon client for non-privileged reads */
export function getSupabaseAnon() {
  const { url, anonKey } = requirePublicSupabaseEnv();
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}

// ── Type helpers ──────────────────────────────────────────────────────────────

export interface HiveLogEntry {
  id?: string;
  created_at?: string;
  bee: "queen" | "scout" | "builder" | "closer" | "treasurer";
  action: string;
  details?: Record<string, unknown>;
  status?: "success" | "error" | "pending_approval" | "vetoed";
  telegram_message_id?: string;
}

export interface Opportunity {
  id?: string;
  created_at?: string;
  updated_at?: string;
  niche: string;
  market?: string;
  score: number;
  demand_signals?: string[];
  competition_level?: "low" | "medium" | "high";
  estimated_mrr_potential?: string;
  recommended_price_point?: string;
  queen_reasoning?: string;
  status?: "discovered" | "pending_approval" | "approved" | "rejected";
}

export interface Campaign {
  id?: string;
  created_at?: string;
  updated_at?: string;
  opportunity_id?: string;
  name: string;
  niche: string;
  status?: "building" | "live" | "paused" | "archived";
  mrr?: number;
  customers?: number;
  stripe_product_id?: string;
  stripe_price_id?: string;
  payment_link?: string;
  copy?: Record<string, unknown>;
}

export interface HitlApproval {
  id?: string;
  created_at?: string;
  hive_log_id?: string;
  action_type: string;
  payload?: Record<string, unknown>;
  status?: "pending" | "approved" | "vetoed";
  decided_at?: string;
  telegram_message_id?: string;
}
