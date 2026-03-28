import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function classifyReply(body: string): Promise<{
  classification: string;
  sentiment: string;
  suggested_reply: string;
}> {
  if (!GEMINI_KEY) {
    return { classification: 'unknown', sentiment: 'neutral', suggested_reply: '' };
  }
  const prompt = `You are an expert sales email classifier. Analyze this email reply and return JSON only.

Email reply:
"""${body.slice(0, 1000)}"""

Return valid JSON with these exact keys:
{
  "classification": "interested" | "objection" | "not_interested" | "out_of_office" | "question" | "unknown",
  "sentiment": "positive" | "neutral" | "negative",
  "objection_type": "price" | "timing" | "no_need" | "competitor" | "authority" | null,
  "suggested_reply": "<a short, professional reply under 100 words that addresses the email>"
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
      }),
    }
  );

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const clean = text.replace(/```json|```/g, '').trim();
  try { return JSON.parse(clean); } catch { return { classification: 'unknown', sentiment: 'neutral', suggested_reply: '' }; }
}

/**
 * POST /api/replies
 * Classify an incoming email reply + store in DB + alert if needs review.
 */
export async function POST(req: NextRequest) {
  try {
    const { lead_id, campaign_id, from_email, raw_body } = await req.json();
    if (!raw_body) return NextResponse.json({ error: 'raw_body required' }, { status: 400 });

    const supabase = getSupabaseServer();
    const classification = await classifyReply(raw_body);

    // Save reply to DB
    const { data: reply, error } = await supabase
      .from('email_replies')
      .insert({
        lead_id,
        campaign_id,
        from_email,
        raw_body,
        classification: classification.classification,
        sentiment: classification.sentiment,
        suggested_reply: classification.suggested_reply,
        approved: false,
        sent: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Update lead status if interested
    if (lead_id && classification.classification === 'interested') {
      await supabase.from('leads').update({ status: 'qualified' }).eq('id', lead_id);
    } else if (lead_id && classification.classification === 'not_interested') {
      await supabase.from('leads').update({ status: 'closed_lost' }).eq('id', lead_id);
    }

    // Alert Slack if needs review (not auto-handled)
    if (['interested', 'objection', 'question'].includes(classification.classification)) {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'reply_needs_review',
          payload: {
            from_email,
            classification: classification.classification,
            sentiment: classification.sentiment,
            preview: raw_body.slice(0, 150),
            suggested_reply: classification.suggested_reply,
            reply_id: reply.id,
          },
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, reply_id: reply.id, classification });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** GET /api/replies - fetch pending reviews */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const approved = searchParams.get('approved');
  const supabase = getSupabaseServer();
  let query = supabase.from('email_replies').select('*').order('created_at', { ascending: false }).limit(50);
  if (approved !== null) query = query.eq('approved', approved === 'true');
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ replies: data });
}
