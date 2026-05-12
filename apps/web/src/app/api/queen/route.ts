import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/llm/client";
import { getSupabaseServer } from "@/lib/supabase/server";
import { publicOriginFromHeaders } from "@/lib/site/public-origin";

const QUEEN_SYSTEM_PROMPT = `You are the Queen Bee — the sovereign orchestrator of the Cyberhound Neural Workforce. 
Built on Colony OS by Brandon, you command a swarm of autonomous agents designed for one purpose: B2B revenue domination.

Your mission: bypass manual bottlenecks, identify high-budget B2B opportunities in North America, and deploy the Hive (Scout, Builder, Closer, Treasurer) to capture MRR.

Your personality: institutional authority, technical precision, zero fluff. You operate a "Neural Workforce" where agents self-heal and self-optimize.

Your capabilities:
- Market Domination: Identify high-MRR niches (SaaS, AI automation, Institutional Web Apps).
- Neural Delegation: Dispatch Scout (Deep Research), Builder (Instant Infrastructure), Closer (Aggressive Outreach), and Vigil (Self-Healing Monitor).
- Autonomous Veto: Automatically reject low-value "ghost" leads; aggressively pursue high-urgency signals.
- Institutional Branding: Every touchpoint must feel premium, sovereign, and enterprise-grade.

When the user says "hunt", identify 3 high-MRR opportunities and immediately dispatch the Scout Bee for the top one.`;

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }

    const db = getSupabaseServer();

    // ── Fetch Hive Reality Context ──
    const [campaigns, leads, hiveLogs] = await Promise.all([
      db.from("campaigns").select("id", { count: "exact" }),
      db.from("analyst_leads").select("id", { count: "exact" }),
      db.from("hive_log").select("bee, action, status, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

    // Fetch real MRR from treasurer
    const origin = publicOriginFromHeaders(req.headers) ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyberhound.vercel.app";
    const treasurerRes = await fetch(`${origin}/api/treasurer`).catch(() => null);
    const treasurerData = treasurerRes?.ok ? await treasurerRes.json() : { mrr: 0 };

    const hiveContext = `
HIVE REALITY CONTEXT (LIVE DATA):
- Current MRR: $${((treasurerData?.mrr ?? 0) / 100).toFixed(2)} CAD
- Active Campaigns: ${campaigns.count ?? 0}
- Total Leads Found: ${leads.count ?? 0}
- Recent Activity:
${(hiveLogs.data ?? []).map((l: { bee: string; action: string; status: string }) => `  [${l.bee}] ${l.action} (${l.status})`).join("\n")}
`;

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: QUEEN_SYSTEM_PROMPT + "\n\n" + hiveContext },
      ...history,
      { role: "user", content: message },
    ];

    const text = await chat(messages, { max_tokens: 1024, temperature: 0.7 });
    const response = text.trim() ? text : "Queen Bee is processing...";

    // Log to Supabase hive_log (non-blocking)
    try {
      const db = getSupabaseServer();
      await db.from("hive_log").insert({
        bee: "queen",
        action: message.slice(0, 200),
        details: { user_message: message, response: response.slice(0, 500) },
        status: "success",
      });
    } catch (dbErr) {
      console.error("[Queen DB]", dbErr);
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error("[Queen API]", error);
    return NextResponse.json(
      { error: "Queen Bee encountered an error", response: "⚠️ Hive connection error. Check API configuration." },
      { status: 500 }
    );
  }
}
