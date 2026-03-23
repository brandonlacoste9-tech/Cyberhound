import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export async function GET() {
  try {
    const db = getSupabaseServer();
    const { data: rows, error } = await db
      .from("campaigns")
      .select(
        "id, name, status, mrr, customer_count, landing_page_url, stripe_payment_link, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      console.error("[Campaigns API]", error);
      return NextResponse.json({ error: "Failed to load campaigns" }, { status: 500 });
    }

    const campaigns = await Promise.all(
      (rows ?? []).map(async (c) => {
        const { data: asset } = await db
          .from("assets")
          .select("content")
          .eq("campaign_id", c.id)
          .eq("type", "copy")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          id: c.id,
          name: c.name,
          status: c.status,
          mrr: c.mrr,
          customers: c.customer_count,
          landing_page_url: c.landing_page_url,
          payment_link: c.stripe_payment_link,
          copy: (asset?.content ?? null) as Json | null,
        };
      })
    );

    return NextResponse.json({ campaigns });
  } catch (e) {
    console.error("[Campaigns API]", e);
    return NextResponse.json({ error: "Campaigns Bee error" }, { status: 500 });
  }
}
