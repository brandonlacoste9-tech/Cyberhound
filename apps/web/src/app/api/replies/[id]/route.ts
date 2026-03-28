import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** PATCH /api/replies/[id] - approve or update an email reply */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { approved, sent } = body;

    const supabase = getSupabaseServer();
    const updates: Record<string, unknown> = {};
    if (approved !== undefined) updates.approved = approved;
    if (sent !== undefined) updates.sent = sent;

    const { data, error } = await supabase
      .from('email_replies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, reply: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** GET /api/replies/[id] - fetch a single reply */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }    const { id } = await params;
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('email_replies')
    .select('*')
    .eq('id', id)    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ reply: data });
}
