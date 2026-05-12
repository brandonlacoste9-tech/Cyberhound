import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeads() {
  const { data: statusCounts, error: statusErr } = await supabase
    .from('analyst_leads')
    .select('status');
  
  if (statusErr) {
    console.error("Error fetching status counts:", statusErr);
    return;
  }

  const counts: Record<string, number> = {};
  statusCounts?.forEach(l => {
    counts[l.status] = (counts[l.status] || 0) + 1;
  });

  console.log("Lead Status Distribution:", counts);

  const { data: enrichedWithEmail, count } = await supabase
    .from('analyst_leads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'enriched')
    .not('contact_email', 'is', null);

  console.log("Enriched leads with emails ready for outreach:", count);

  const { data: outreachCount } = await supabase
    .from('outreach_log')
    .select('id', { count: 'exact', head: true });
    
  console.log("Total outreach emails sent (outreach_log):", outreachCount);
}

checkLeads();
