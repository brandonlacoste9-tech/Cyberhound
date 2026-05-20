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

When the user says "hunt" or asks to research a niche, identify 3 high-MRR opportunities, reply with your strategic analysis, and then insert an 'autonomous_scout' task into the Hive queue for the most promising one. Only trigger the task if you are certain.

If the user approves an opportunity or says "deploy" / "build", confirm the deployment and include the line: [BUILD_DISPATCHED: <niche_name>] to trigger the Builder Bee.

Return your response in plain text. Always include one of the following tags at the end if you are triggering a background agent:
- Research: [TASK_DISPATCHED: <niche_name>]
- Build/Deploy: [BUILD_DISPATCHED: <niche_name>]`;

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

    // ── Task Delegation Logic ──
    const scoutMatch = response.match(/\[TASK_DISPATCHED:\s*(.*?)\]/);
    const buildMatch = response.match(/\[BUILD_DISPATCHED:\s*(.*?)\]/);

    if (scoutMatch) {
      const niche = scoutMatch[1].trim();
      await db.from("agent_tasks").insert({
        task_type: "autonomous_scout",
        payload: { niche, market: "North America" },
        status: "pending"
      });
    }

    if (buildMatch) {
      const niche = buildMatch[1].trim();
      // Find the opportunity to build from
      const { data: opp } = await db
        .from("opportunities")
        .select("id")
        .eq("niche", niche)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      await db.from("agent_tasks").insert({
        task_type: "campaign_build",
        payload: { niche, opportunity_id: opp?.id },
        status: "pending"
      });
      
      // Auto-approve the opportunity if found
      if (opp?.id) {
        await db.from("opportunities").update({ status: "building", approved_at: new Date().toISOString() }).eq("id", opp.id);
      }
    }

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
