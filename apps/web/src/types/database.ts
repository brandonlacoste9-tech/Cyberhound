export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type HoundStatus = "idle" | "hunting" | "building" | "closing" | "paused" | "live";
export type OpportunityStatus = "discovered" | "pending_approval" | "approved" | "rejected" | "building" | "live" | "archived";
export type OutreachStatus = "queued" | "sent" | "opened" | "replied" | "converted" | "bounced" | "pending_approval" | "failed";
export type BeeType = "queen" | "scout" | "builder" | "closer" | "closer_v2" | "treasurer" | "analyst" | "enrich" | "scheduler" | "wasp";
export type AnalystSource = "upwork" | "churn" | "reddit";
export type AnalystLeadStatus = "new" | "enriched" | "queued" | "sent" | "replied" | "converted" | "skipped";
export type SequenceStatus = "active" | "replied" | "unsubscribed" | "completed" | "paused" | "cancelled" | "failed";

/** Standalone row type so `Update` is not inferred as `never` (circular `Partial<Insert>`). */
export interface OpportunityRow {
  id: string;
  created_at: string;
  updated_at: string;
  niche: string;
  market: string;
  description: string;
  score: number;
  status: OpportunityStatus;
  scout_data: Json;
  queen_reasoning: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  campaign_id: string | null;
  // Added in migration 005
  demand_signals: string[] | null;
  competition_level: "low" | "medium" | "high" | null;
  estimated_mrr_potential: string | null;
  recommended_price_point: string | null;
}

export interface AnalystLeadRow {
  id: string;
  created_at: string;
  updated_at: string;
  source: AnalystSource;
  signal_type: string;
  title: string;
  url: string | null;
  raw_text: string | null;
  company: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_linkedin: string | null;
  budget: string | null;
  pain_point: string;
  urgency: "high" | "medium" | "low";
  recommended_service: string;
  personalization_hook: string;
  enrichment_source: "apollo" | "pattern" | "manual" | null;
  enrichment_confidence: "high" | "medium" | "low" | null;
  status: AnalystLeadStatus;
  campaign_id: string | null;
}

export interface FollowUpSequenceRow {
  id: string;
  created_at: string;
  lead_id: string | null;
  campaign_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  company: string | null;
  total_emails: number;
  sent_count: number;
  current_step: number;
  next_send_at: string | null;
  last_sent_at: string | null;
  status: SequenceStatus;
  sequence: Json;
  replied_at: string | null;
  reply_content: string | null;
}

export interface Database {
  public: {
    Tables: {
      opportunities: {
        Row: OpportunityRow;
        Insert: Omit<OpportunityRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<OpportunityRow, "id" | "created_at">>;
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          opportunity_id: string | null;
          status: HoundStatus;
          landing_page_url: string | null;
          stripe_product_id: string | null;
          stripe_price_id: string | null;
          stripe_payment_link: string | null;
          mrr: number;
          customer_count: number;
          target_mrr: number;
        };
        Insert: Omit<Database["public"]["Tables"]["campaigns"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Insert"]>;
        Relationships: [];
      };
      assets: {
        Row: {
          id: string;
          created_at: string;
          campaign_id: string;
          type: "landing_page" | "email_sequence" | "stripe_product" | "copy";
          content: Json;
          url: string | null;
          status: "draft" | "live" | "archived";
        };
        Insert: Omit<Database["public"]["Tables"]["assets"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["assets"]["Insert"]>;
        Relationships: [];
      };
      outreach_log: {
        Row: {
          id: string;
          created_at: string;
          campaign_id: string | null;
          channel: "email" | "telegram" | "linkedin" | null;
          recipient: string | null;
          recipient_email: string | null;
          recipient_name: string | null;
          subject: string | null;
          body: string | null;
          sequence_number: number | null;
          resend_id: string | null;
          approval_id: string | null;
          recipient_count: number | null;
          recipients: Json | null;
          sequence: Json | null;
          status: OutreachStatus;
          sent_at: string | null;
          opened_at: string | null;
          replied_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["outreach_log"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["outreach_log"]["Insert"]>;
        Relationships: [];
      };
      analyst_leads: {
        Row: AnalystLeadRow;
        Insert: Omit<AnalystLeadRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<AnalystLeadRow, "id" | "created_at">>;
        Relationships: [];
      };
      follow_up_sequences: {
        Row: FollowUpSequenceRow;
        Insert: Omit<FollowUpSequenceRow, "id" | "created_at">;
        Update: Partial<Omit<FollowUpSequenceRow, "id" | "created_at">>;
        Relationships: [];
      };
      revenue_events: {
        Row: {
          id: string;
          created_at: string;
          campaign_id: string | null;
          stripe_event_id: string;
          event_type: string;
          amount: number;
          currency: string;
          customer_email: string | null;
          metadata: Json;
        };
        Insert: Omit<Database["public"]["Tables"]["revenue_events"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["revenue_events"]["Insert"]>;
        Relationships: [];
      };
      hive_log: {
        Row: {
          id: string;
          created_at: string;
          bee: BeeType;
          action: string;
          details: Json;
          status: "success" | "error" | "pending_approval" | "vetoed" | "idle" | "failed" | "pending";
          telegram_message_id: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["hive_log"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["hive_log"]["Insert"]>;
        Relationships: [];
      };
      hitl_approvals: {
        Row: {
          id: string;
          created_at: string;
          hive_log_id: string;
          action_type: string;
          payload: Json;
          status: "pending" | "approved" | "vetoed";
          decided_at: string | null;
          telegram_message_id: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["hitl_approvals"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["hitl_approvals"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
