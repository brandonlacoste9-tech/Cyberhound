export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type HoundStatus = "idle" | "hunting" | "building" | "closing" | "paused";
export type OpportunityStatus = "discovered" | "pending_approval" | "approved" | "rejected" | "building" | "live" | "archived";
export type OutreachStatus = "queued" | "sent" | "opened" | "replied" | "converted" | "bounced";
export type BeeType = "queen" | "scout" | "builder" | "closer" | "treasurer";

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      opportunities: {
        Row: {
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
        };
        Insert: Omit<Database["public"]["Tables"]["opportunities"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["opportunities"]["Insert"]>;
      };
      campaigns: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          opportunity_id: string;
          status: HoundStatus;
          landing_page_url: string | null;
          stripe_product_id: string | null;
          stripe_price_id: string | null;
          mrr: number;
          customer_count: number;
          target_mrr: number;
        };
        Insert: Omit<Database["public"]["Tables"]["campaigns"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Insert"]>;
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
      };
      outreach_log: {
        Row: {
          id: string;
          created_at: string;
          campaign_id: string;
          channel: "email" | "telegram" | "linkedin";
          recipient: string;
          subject: string | null;
          body: string;
          status: OutreachStatus;
          sent_at: string | null;
          opened_at: string | null;
          replied_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["outreach_log"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["outreach_log"]["Insert"]>;
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
      };
      hive_log: {
        Row: {
          id: string;
          created_at: string;
          bee: BeeType;
          action: string;
          details: Json;
          status: "success" | "error" | "pending_approval" | "vetoed";
          telegram_message_id: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["hive_log"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["hive_log"]["Insert"]>;
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
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
