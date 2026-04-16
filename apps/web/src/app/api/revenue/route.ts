import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** GET /api/revenue - fetch real-time MRR and stats from Stripe */
export async function GET() {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey === "placeholder" || !stripeKey.startsWith("sk_")) {
      return NextResponse.json({ 
        mrr: 0, 
        subscription_count: 0, 
        last_payment_date: null,
        error: "Stripe not configured" 
      });
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    // Fetch active subscriptions
    const subs = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.latest_invoice"],
    });

    let mrr = 0;
    for (const sub of subs.data) {
      for (const item of sub.items.data) {
        const price = item.price;
        const amount = price.unit_amount ?? 0;
        if (price.recurring?.interval === "year") {
          mrr += Math.round(amount / 12);
        } else {
          mrr += amount;
        }
      }
    }

    // Last payment date
    const charges = await stripe.charges.list({ limit: 1 });
    const lastPaymentDate = charges.data[0] 
      ? new Date(charges.data[0].created * 1000).toISOString() 
      : null;

    return NextResponse.json({
      mrr,
      subscription_count: subs.data.length,
      last_payment_date: lastPaymentDate,
      currency: "cad",
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/** POST /api/revenue - record a revenue event (Stripe webhook or manual) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      lead_id,
      campaign_id,
      amount_cents,
      mrr_cents = 0,
      status = 'paid',
      type = 'one_time',
      paid_at = new Date().toISOString(),
      stripe_payment_intent_id,
      stripe_subscription_id,
      notes,
    } = body;

    if (!amount_cents) return NextResponse.json({ error: 'amount_cents required' }, { status: 400 });

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('revenue')
      .insert({
        lead_id,
        campaign_id,
        amount_cents,
        mrr_cents,
        status,
        type,
        paid_at,
        stripe_payment_intent_id,
        stripe_subscription_id,
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, revenue_id: data.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
