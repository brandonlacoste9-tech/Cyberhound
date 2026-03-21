import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    // Pull campaign MRR from Supabase
    let campaignMrr = 0;
    let campaignCount = 0;
    let campaigns: Array<{ id: string; name: string; mrr: number; customers: number; status: string }> = [];

    try {
      const db = getSupabaseServer();
      const { data: campRows } = await db
        .from("campaigns")
        .select("id, name, mrr, customers, status")
        .eq("status", "live");

      if (campRows) {
        campaigns = campRows;
        campaignMrr = campRows.reduce((sum, c) => sum + (c.mrr ?? 0), 0);
        campaignCount = campRows.length;
      }
    } catch (dbErr) {
      console.error("[Treasurer DB]", dbErr);
    }

    // If Stripe is configured, add live subscription MRR on top
    if (!stripeKey || stripeKey === "placeholder") {
      return NextResponse.json({
        mrr: campaignMrr,
        arr: campaignMrr * 12,
        active_subscriptions: campaignCount,
        new_this_month: 0,
        churned_this_month: 0,
        net_revenue_30d: campaignMrr,
        campaigns,
      });
    }

    // Stripe is configured — pull live data
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    const subscriptions = await stripe.subscriptions.list({ status: "active", limit: 100 });

    let stripeMrr = 0;
    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const price = item.price;
        const amount = price.unit_amount ?? 0;
        if (price.recurring?.interval === "year") {
          stripeMrr += Math.round(amount / 12);
        } else if (price.recurring?.interval === "month") {
          stripeMrr += amount;
        }
      }
    }

    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    const charges = await stripe.charges.list({ limit: 100, created: { gte: thirtyDaysAgo } });
    const netRevenue30d = charges.data
      .filter((c) => c.paid && !c.refunded)
      .reduce((sum, c) => sum + c.amount, 0);

    const totalMrr = stripeMrr + campaignMrr;

    return NextResponse.json({
      mrr: totalMrr,
      arr: totalMrr * 12,
      active_subscriptions: subscriptions.data.length + campaignCount,
      new_this_month: 0,
      churned_this_month: 0,
      net_revenue_30d: netRevenue30d + campaignMrr,
      campaigns,
    });
  } catch (error) {
    console.error("[Treasurer API]", error);
    return NextResponse.json({ error: "Treasurer Bee encountered an error" }, { status: 500 });
  }
}
