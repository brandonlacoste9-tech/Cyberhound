import { getSupabaseServer } from "../apps/web/src/lib/supabase/server";

async function checkMovement() {
  const db = getSupabaseServer();
  const { data: counts, error } = await db
    .from("analyst_leads")
    .select("status");

  if (error) {
    console.error(error);
    return;
  }

  const stats = counts.reduce((acc: any, curr: any) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});

  console.log("📍 Current Lead Status Distribution:");
  console.table(stats);
}

checkMovement();
