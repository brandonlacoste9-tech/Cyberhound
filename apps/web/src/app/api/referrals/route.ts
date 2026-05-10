import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function generateCode(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
}

/** POST /api/referrals - create referral code for a lead */
export async function POST(req: NextRequest) {
  try {
    const { lead_id, commission_pct = 20 } = await req.json();
    if (!lead_id) return NextResponse.json({ error: 'lead_id required' }, { status: 400 });

    const supabase = getSupabaseServer();
    const code = `REF-${generateCode()}`;

    const { data, error } = await supabase
      .from('referrals')
      .insert({ lead_id, referral_code: code, commission_pct })
      .select()
      .single();

    if (error) throw error;

    // Also update lead with referral code
    await supabase.from('leads').update({ referral_code: code }).eq('id', lead_id);

    const referral_url = `${process.env.NEXT_PUBLIC_SITE_URL}/r/${code}`;
    return NextResponse.json({ success: true, code, referral_url, referral: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** GET /api/referrals - list all referrals with earnings */
export async function GET() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('referrals')
    .select('*, leads(name, email, company)')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ referrals: data });
}

/** PATCH /api/referrals - track a referral conversion */
export async function PATCH(req: NextRequest) {
  try {
    const { referral_code, commission_earned_cents } = await req.json();
    if (!referral_code) return NextResponse.json({ error: 'referral_code required' }, { status: 400 });

    const supabase = getSupabaseServer();
    const { data: ref } = await supabase
      .from('referrals')
      .select('*')
      .eq('referral_code', referral_code)
      .single();

    if (!ref) return NextResponse.json({ error: 'Referral not found' }, { status: 404 });

    await supabase.from('referrals').update({
      total_referred: ref.total_referred + 1,
      total_earned_cents: ref.total_earned_cents + (commission_earned_cents || 0),
    }).eq('referral_code', referral_code);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
