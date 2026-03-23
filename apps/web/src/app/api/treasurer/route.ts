import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const db = getSupabaseServer();

    // ── Pull campaign data from Supabase ──
    let campaignMrr = 0;
    let campaigns: Array<{
      id: string;
      name: string;
      mrr: number;
      customers: number;
      status: string;
      payment_link: string | null; // mapped from stripe_payment_link
      stripe_product_id: string | null;
    }> = [];

    try {
      const { data: campRows } = await db
        .from("campaigns")
        .select("id, name, mrr, customer_count, status, stripe_payment_link, stripe_product_id")
        .order("created_at", { ascending: false });

      if (campRows) {
        campaigns = campRows.map((c) => ({
          id: c.id,
          name: c.name,
          mrr: c.mrr,
          customers: c.customer_count,
          status: c.status,
          payment_link: c.stripe_payment_link,
          stripe_product_id: c.stripe_product_id,
        }));
        campaignMrr = campRows
          .filter((c) => c.status === "live")
          .reduce((sum, c) => sum + (c.mrr ?? 0), 0);
      }
    } catch (dbErr) {
      console.error("[Treasurer DB]", dbErr);
    }

    // ── No Stripe key — return DB-only data ──
    if (!stripeKey || stripeKey === "placeholder" || stripeKey === "sk_test_placeholder") {
      return NextResponse.json({
        mrr: campaignMrr,
        arr: campaignMrr * 12,
        active_subscriptions: campaigns.filter((c) => c.status === "live").length,
        new_this_month: 0,
        churned_this_month: 0,
        net_revenue_30d: campaignMrr,
        churn_rate: 0,
        ltv: 0,
        currency: "cad",
        campaigns,
        stripe_connected: false,
      });
    }

    // ── Stripe is live — pull real data ──
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60;

    // Active subscriptions
    const [activeSubs, canceledSubs, charges, customers] = await Promise.all([
      stripe.subscriptions.list({ status: "active", limit: 100 }),
      stripe.subscriptions.list({
        status: "canceled",
        limit: 100,
        created: { gte: thirtyDaysAgo },
      }),
      stripe.charges.list({ limit: 100, created: { gte: thirtyDaysAgo } }),
      stripe.customers.list({ limit: 100, created: { gte: thirtyDaysAgo } }),
    ]);

    // Calculate live MRR from Stripe subscriptions
    let stripeMrr = 0;
    for (const sub of activeSubs.data) {
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

    // Net revenue last 30 days (in cents)
    const netRevenue30d = charges.data
      .filter((c) => c.paid && !c.refunded)
      .reduce((sum, c) => sum + c.amount, 0);

    // New subs this month
    const newThisMonth = activeSubs.data.filter(
      (s) => s.created >= thirtyDaysAgo
    ).length;

    // Churned this month
    const churnedThisMonth = canceledSubs.data.length;

    // Churn rate %
    const totalActivePrev = activeSubs.data.length + churnedThisMonth;
    const churnRate = totalActivePrev > 0
      ? Math.round((churnedThisMonth / totalActivePrev) * 100 * 10) / 10
      : 0;

    // LTV estimate: avg MRR per customer / churn rate
    const avgMrrPerCustomer = activeSubs.data.length > 0
      ? stripeMrr / activeSubs.data.length
      : 0;
    const ltv = churnRate > 0
      ? Math.round((avgMrrPerCustomer / (churnRate / 100)) / 100) // in dollars
      : 0;

    // New customers (last 30d vs 30-60d for trend)
    const newCustomers30d = customers.data.length;

    // MRR history — last 6 months from Stripe invoices
    const invoices = await stripe.invoices.list({
      limit: 100,
      created: { gte: sixtyDaysAgo },
      status: "paid",
    });

    // Group by month
    const mrrHistory: Record<string, number> = {};
    for (const inv of invoices.data) {
      const month = new Date(inv.created * 1000).toLocaleString("en-CA", {
        month: "short",
        year: "2-digit",
      });
      mrrHistory[month] = (mrrHistory[month] ?? 0) + (inv.amount_paid ?? 0);
    }

    const totalMrr = stripeMrr + campaignMrr;

    // Update campaign MRR in Supabase from Stripe data (sync)
    for (const sub of activeSubs.data) {
      const productId = sub.items.data[0]?.price?.product as string | undefined;
      if (productId) {
        const campaign = campaigns.find((c) => c.stripe_product_id === productId);
        if (campaign) {
          const subMrr = sub.items.data.reduce((sum, item) => {
            return sum + (item.price.unit_amount ?? 0);
          }, 0);
          await db
            .from("campaigns")
            .update({ mrr: subMrr, customer_count: 1 })
            .eq("id", campaign.id);
        }
      }
    }

    return NextResponse.json({
      mrr: totalMrr,
      arr: totalMrr * 12,
      active_subscriptions: activeSubs.data.length,
      new_this_month: newThisMonth,
      churned_this_month: churnedThisMonth,
      net_revenue_30d: netRevenue30d,
      new_customers_30d: newCustomers30d,
      churn_rate: churnRate,
      ltv,
      currency: "cad",
      mrr_history: mrrHistory,
      campaigns,
      stripe_connected: true,
    });
  } catch (error) {
    console.error("[Treasurer API]", error);
    return NextResponse.json({ error: "Treasurer Bee encountered an error" }, { status: 500 });
  }
}
