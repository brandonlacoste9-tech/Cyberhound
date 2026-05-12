import { getSupabaseServer } from "../apps/web/src/lib/supabase/server";

async function monitorHive() {
  const db = getSupabaseServer();
  console.log("👀 Monitoring Cyberhound Hive activity...");

  const { data: logs, error } = await db
    .from("hive_log")
    .select("bee, action, status, created_at, details")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("❌ Error fetching logs:", error);
    return;
  }

  console.table(
    logs.map((l) => ({
      time: new Date(l.created_at).toLocaleTimeString(),
      bee: l.bee,
      action: l.action,
      status: l.status,
    }))
  );

  const { count: pendingLeads } = await db
    .from("analyst_leads")
    .select("*", { count: "exact", head: true })
    .eq("status", "new");

  const { count: enrichedLeads } = await db
    .from("analyst_leads")
    .select("*", { count: "exact", head: true })
    .eq("status", "enriched");

  const { count: sentLeads } = await db
    .from("analyst_leads")
    .select("*", { count: "exact", head: true })
    .eq("status", "sent");

  console.log(`\n📊 Pipeline Stats:`);
  console.log(`🔹 Pending (New): ${pendingLeads}`);
  console.log(`🔬 Enriched: ${enrichedLeads}`);
  console.log(`🚀 Sent/Queued: ${sentLeads}`);
}

monitorHive();
