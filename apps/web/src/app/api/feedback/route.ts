import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** POST /api/feedback - submit survey/feedback */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      lead_id, campaign_id, type = 'post_purchase',
      rating, why_bought, pain_points, feature_requests, nps_score, raw
    } = body;

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('feedback')
      .insert({ lead_id, campaign_id, type, rating, why_bought, pain_points, feature_requests, nps_score, raw: raw || body })
      .select()
      .single();

    if (error) throw error;

    // If NPS is a promoter (9-10), auto-generate referral code
    if (nps_score >= 9 && lead_id) {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/referrals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id, commission_pct: 20 }),
      }).catch(() => {});
    }

    // If churn exit, alert Slack
    if (type === 'churn_exit') {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'churn_risk',
          payload: { lead_id, campaign_id, pain_points, rating },
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, feedback_id: data.id }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** GET /api/feedback - get all feedback with aggregates */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const supabase = getSupabaseServer();

  let query = supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(100);
  if (type) query = query.eq('type', type);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute averages
  const avg_rating = data?.length ? data.reduce((s, f) => s + (f.rating || 0), 0) / data.length : 0;
  const avg_nps = data?.length ? data.reduce((s, f) => s + (f.nps_score || 0), 0) / data.length : 0;
  const promoters = data?.filter(f => (f.nps_score || 0) >= 9).length || 0;
  const detractors = data?.filter(f => (f.nps_score || 0) <= 6).length || 0;
  const nps_score = data?.length ? Math.round(((promoters - detractors) / data.length) * 100) : 0;

  return NextResponse.json({ feedback: data, stats: { avg_rating: Math.round(avg_rating * 10) / 10, avg_nps: Math.round(avg_nps * 10) / 10, nps_score, promoters, detractors, total: data?.length || 0 } });
}
