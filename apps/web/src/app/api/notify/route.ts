import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/notify
 * Send Slack webhook notification for key CyberHound events.
 * Events: high_score_opp | deal_closed | lead_captured | churn_risk | campaign_built
 */
export async function POST(req: NextRequest) {
  try {
    const { event_type, payload } = await req.json();
    const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

    const supabase = getSupabaseServer();

    // Build Slack message based on event type
    let slackMessage = '';
    let emoji = '🐝';

    switch (event_type) {
      case 'high_score_opp':
        emoji = '🚀';
        slackMessage = `*High-Score Opportunity Found!*\n` +
          `Niche: ${payload.niche}\n` +
          `Score: ${payload.score}/100\n` +
          `Market: ${payload.market}\n` +
          `Est. MRR: ${payload.estimated_mrr_potential}\n` +
          `Auto-approved: ${payload.auto_approved ? 'Yes' : 'Pending review'}`;
        break;

      case 'lead_captured':
        emoji = '📥';
        slackMessage = `*New Lead Captured!*\n` +
          `Name: ${payload.name || 'Unknown'}\n` +
          `Email: ${payload.email}\n` +
          `Company: ${payload.company || 'N/A'}\n` +
          `Campaign: ${payload.campaign_id || 'N/A'}`;
        break;

      case 'deal_closed':
        emoji = '💰';
        slackMessage = `*DEAL CLOSED!* 🎉\n` +
          `Customer: ${payload.email}\n` +
          `Amount: $${((payload.amount_cents || 0) / 100).toFixed(2)}\n` +
          `MRR: $${((payload.mrr_cents || 0) / 100).toFixed(2)}/mo\n` +
          `Campaign: ${payload.campaign_id || 'N/A'}`;
        break;

      case 'campaign_built':
        emoji = '🏗️';
        slackMessage = `*New Campaign Built!*\n` +
          `Niche: ${payload.niche}\n` +
          `Status: ${payload.status}\n` +
          `Landing Page: ${payload.landing_page_url || 'Building...'}`;
        break;

      case 'churn_risk':
        emoji = '⚠️';
        slackMessage = `*Churn Risk Alert!*\n` +
          `Customer: ${payload.email}\n` +
          `Last Active: ${payload.last_active}\n` +
          `Action: Reach out now!`;
        break;

      case 'reply_needs_review':
        emoji = '📧';
        slackMessage = `*Email Reply Needs Review*\n` +
          `From: ${payload.from_email}\n` +
          `Classification: ${payload.classification}\n` +
          `Sentiment: ${payload.sentiment}\n` +
          `Preview: ${(payload.preview || '').slice(0, 100)}...`;
        break;

      default:
        slackMessage = `CyberHound Event: ${event_type}\n${JSON.stringify(payload, null, 2).slice(0, 300)}`;
    }

    // Send to Slack if webhook configured
    if (SLACK_WEBHOOK_URL) {
      const slackRes = await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${emoji} ${slackMessage}`,
          username: 'CyberHound',
          icon_emoji: ':bee:',
        }),
      });

      if (!slackRes.ok) {
        console.error('[Notify] Slack webhook failed:', await slackRes.text());
      }
    }

    // Always log to DB regardless of Slack
    await supabase.from('notifications').insert({
      channel: 'slack',
      event_type,
      payload,
      sent: !!SLACK_WEBHOOK_URL,
      sent_at: SLACK_WEBHOOK_URL ? new Date().toISOString() : null,
    });

    return NextResponse.json({ success: true, slack_sent: !!SLACK_WEBHOOK_URL });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/notify - list recent notifications
 */
export async function GET() {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  return NextResponse.json({ notifications: data || [] });
}
