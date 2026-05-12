import { getSupabaseServer } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabaseServer();

  try {
    // 1. Fetch latest Hermes Activity
    const { data: activity } = await supabase
      .from('hive_log')
      .select('*')
      .eq('bee', 'hermes')
      .order('created_at', { ascending: false })
      .limit(10);

    // 2. Fetch latest Consensus Alpha
    const { data: consensus } = await supabase
      .from('consensus_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      status: "ONLINE",
      pulse: "ACTIVE",
      workforce: "HERMES_CORE_V2",
      neural_load: 0.12,
      activity: activity || [],
      consensus: consensus || []
    });

  } catch {
    return NextResponse.json({ error: "Neural Disconnect" }, { status: 500 });
  }
}
