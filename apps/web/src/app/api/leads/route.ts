import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { sendHiveUpdate } from '@/lib/telegram/notify';

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

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Check for duplicate
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('email', email)
      .eq('campaign_id', campaign_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ message: 'Already registered', lead_id: existing.id });
    }

    // Insert lead
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
      })
      .select()
      .single();

    if (error) throw error;

    // Track funnel event
    await supabase.from('funnel_events').insert({
      campaign_id,
      lead_id: lead.id,
      event: 'form_submit',
      properties: { email, name, company, source },
    });

    // Update campaign lead count
    await supabase.rpc('increment_lead_count', { p_campaign_id: campaign_id }).maybeSingle();

    // Notify via Telegram/Slack
    try {
      await sendHiveUpdate(
        `New lead captured!\n` +
        `Name: ${name || 'Unknown'}\n` +
        `Email: ${email}\n` +
        `Company: ${company || 'N/A'}\n` +
        `Source: ${source}`
      );
    } catch { /* non-critical */ }

    // Log notification for Slack
    await supabase.from('notifications').insert({
      channel: 'slack',
      event_type: 'lead_captured',
      payload: { lead_id: lead.id, email, name, company, campaign_id },
      sent: false,
    });

    // Queue Apify enrichment job (async - fire and forget)
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: lead.id, email, company, website }),
    }).catch(() => {});

    return NextResponse.json({ success: true, lead_id: lead.id }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/leads?campaign_id=xxx
 * Fetch leads for a campaign (admin use).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaign_id = searchParams.get('campaign_id');
    const status = searchParams.get('status');

    const supabase = getSupabaseServer();
    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (campaign_id) query = query.eq('campaign_id', campaign_id);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.limit(100);
    if (error) throw error;

    return NextResponse.json({ leads: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
