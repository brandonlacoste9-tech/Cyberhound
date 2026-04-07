import { getSupabaseServer } from "@/lib/supabase/server";

export function normalizeKey(value: string | null | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isRecent(isoDate: string | null | undefined, maxAgeDays: number): boolean {
  if (!isoDate) return false;
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= maxAgeDays * 24 * 60 * 60 * 1000;
}

export async function findRecentOpportunity(params: {
  niche: string;
  market?: string;
  maxAgeDays?: number;
}) {
  const db = getSupabaseServer();
  const { niche, market, maxAgeDays = 7 } = params;
  const normalizedNiche = normalizeKey(niche);

  const { data } = await db
    .from("opportunities")
    .select("id, niche, market, status, created_at, campaign_id")
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).find(
    (row) =>
      normalizeKey(row.niche) === normalizedNiche &&
      (!market || normalizeKey(row.market) === normalizeKey(market)) &&
      isRecent(row.created_at, maxAgeDays)
  );
}

export async function findExistingCampaign(params: {
  opportunityId?: string | null;
  niche?: string | null;
}) {
  const db = getSupabaseServer();
  const { opportunityId, niche } = params;

  if (opportunityId) {
    const { data } = await db
      .from("campaigns")
      .select("id, name, status, opportunity_id, landing_page_url, stripe_payment_link")
      .eq("opportunity_id", opportunityId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  if (niche) {
    const normalizedNiche = normalizeKey(niche);
    const { data } = await db
      .from("campaigns")
      .select("id, name, status, opportunity_id, landing_page_url, stripe_payment_link, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    return (data ?? []).find((row) => normalizeKey(row.name) === normalizedNiche) ?? null;
  }

  return null;
}

export async function hasActiveOutreach(params: {
  leadId?: string | null;
  campaignId?: string | null;
  recipientEmail?: string | null;
}) {
  const db = getSupabaseServer();
  const { leadId, campaignId, recipientEmail } = params;

  if (leadId) {
    const { data: seq } = await db
      .from("follow_up_sequences")
      .select("id, status")
      .eq("lead_id", leadId)
      .in("status", ["active", "paused", "completed"])
      .limit(1)
      .maybeSingle();
    if (seq) return true;
  }

  if (recipientEmail) {
    const { data: log } = await db
      .from("outreach_log")
      .select("id, status")
      .eq("recipient_email", recipientEmail)
      .in("status", ["sent", "opened", "replied", "converted"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (log) return true;
  }

  if (campaignId && recipientEmail) {
    const { data: seqByCampaign } = await db
      .from("follow_up_sequences")
      .select("id, status")
      .eq("campaign_id", campaignId)
      .eq("recipient_email", recipientEmail)
      .in("status", ["active", "paused", "completed"])
      .limit(1)
      .maybeSingle();
    if (seqByCampaign) return true;
  }

  return false;
}
