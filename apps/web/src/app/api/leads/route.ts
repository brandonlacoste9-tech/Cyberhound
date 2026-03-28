import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { sendTelegramAlert } from '@/lib/telegram/notify';

export const runtime = 'nodejs';

/**
 * POST /api/leads
 * Capture an inbound lead from a campaign landing page.
 * Also fires Slack/Telegram notification + queues Apify enrichment.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      campaign_id,
      email,
      name,
      company,
      phone,
      website,
      source = 'landing_page',
      referral_code,
    } = body;

    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const supabase = getSupabaseServer();

    // Dedup check
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('email', email)
      .eq('campaign_id', campaign_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, lead_id: existing.id, duplicate: true });
    }

    // Insert new lead
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        campaign_id,
        email,
        name,
        company,
        phone,
        website,
        source,
        referral_code,
        status: 'new',
        score: 0,
      })
      .select()
      .single();

    if (error) throw error;

    // Fire Telegram notification
    await sendTelegramAlert({
      text: `🎯 *New Lead Captured!*\n\n*Email:* ${email}\n*Name:* ${name || 'Unknown'}\n*Company:* ${company || 'Unknown'}\n*Source:* ${source}`,
      parse_mode: 'Markdown',
    }).catch(() => {});

    // Notify via Slack
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'lead_captured',
        payload: { email, name, company, source, campaign_id },
      }),
    }).catch(() => {});

    // Queue Apify enrichment if website provided
    if (website) {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id, website }),
      }).catch(() => {});
    }

    // Track referral conversion
    if (referral_code) {
      await supabase
        .from('referrals')
        .update({ total_referred: supabase.rpc('increment', { x: 1 }) })
        .eq('referral_code', referral_code)
        .catch(() => {});
    }

    return NextResponse.json({ success: true, lead_id: lead.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** GET /api/leads - fetch leads with optional filters */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const campaign_id = searchParams.get('campaign_id');
  const limit = parseInt(searchParams.get('limit') || '100');

  const supabase = getSupabaseServer();
  let query = supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);
  if (campaign_id) query = query.eq('campaign_id', campaign_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data });
}
