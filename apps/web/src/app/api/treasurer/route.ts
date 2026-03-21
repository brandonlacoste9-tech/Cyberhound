import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function GET(req: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({
        mrr: 0,
        arr: 0,
        active_subscriptions: 0,
        new_this_month: 0,
        churned_this_month: 0,
        net_revenue_30d: 0,
        campaigns: [],
      });
    }

    const stripe = new Stripe(stripeKey);

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
    });

    // Calculate MRR from active subscriptions
    let mrr = 0;
    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const price = item.price;
        const amount = price.unit_amount ?? 0;
        if (price.recurring?.interval === "year") {
          mrr += Math.round(amount / 12);
        } else if (price.recurring?.interval === "month") {
          mrr += amount;
        }
      }
    }

    // Get revenue events from last 30 days
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    const charges = await stripe.charges.list({
      limit: 100,
      created: { gte: thirtyDaysAgo },
    });

    const netRevenue30d = charges.data
      .filter((c) => c.paid && !c.refunded)
      .reduce((sum, c) => sum + c.amount, 0);

    return NextResponse.json({
      mrr,
      arr: mrr * 12,
      active_subscriptions: subscriptions.data.length,
      new_this_month: 0, // TODO: calculate from events
      churned_this_month: 0,
      net_revenue_30d: netRevenue30d,
    });
  } catch (error) {
    console.error("[Treasurer API]", error);
    return NextResponse.json({ error: "Treasurer Bee encountered an error" }, { status: 500 });
  }
}
