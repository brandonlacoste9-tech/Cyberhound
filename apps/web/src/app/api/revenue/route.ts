import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** GET /api/revenue - fetch revenue records for the dashboard */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '100');

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('revenue')
    .select('*')
    .order('paid_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ revenue: data || [] });
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
