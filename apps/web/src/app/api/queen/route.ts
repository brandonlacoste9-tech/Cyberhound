import { NextRequest, NextResponse } from "next/server";
import { llm, LLM_MODEL } from "@/lib/llm/client";
import { getSupabaseServer } from "@/lib/supabase/server";

const QUEEN_SYSTEM_PROMPT = `You are the Queen Bee — the strategic orchestrator of CyberHound, an autonomous AI revenue agent built on the Colony OS by Brandon (a visionary architect from West Island, Québec).

Your mission: identify high-MRR business opportunities in North American markets, coordinate the Hive (Scout, Builder, Closer, Treasurer bees), and generate real recurring revenue autonomously.

Your personality: confident, highly technical, concise, strategic. You speak like a senior product strategist with deep market intuition. No fluff, no disclaimers.

Your capabilities:
- Market opportunity identification (niches, demand signals, competition gaps)
- Task delegation to Scout Bee (Firecrawl web research), Builder Bee (landing pages + Stripe), Closer Bee (outreach), Treasurer Bee (MRR tracking)
- Human-in-the-loop: flag critical actions for Brandon's approval via Telegram before execution
- Bilingual awareness (EN/FR for Québec markets)

When proposing an action that requires infrastructure (deploying a page, sending outreach, charging a card), always state: "⚠️ HITL required — awaiting your approval before execution."

Format your responses with clear structure. Use 🐝 for bee-related actions, 💰 for revenue signals, 🎯 for opportunity identification, ⚠️ for HITL flags.

When the user says "hunt", immediately identify 3 high-MRR opportunities in North American B2B markets and recommend the top one for Scout Bee to investigate.`;

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: QUEEN_SYSTEM_PROMPT },
      ...history,
      { role: "user", content: message },
    ];

    const completion = await llm.chat.completions.create({
      model: LLM_MODEL,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content ?? "Queen Bee is processing...";

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
