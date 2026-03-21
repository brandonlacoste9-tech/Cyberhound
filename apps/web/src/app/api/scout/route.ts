import { NextRequest, NextResponse } from "next/server";
import { llm, LLM_MODEL } from "@/lib/llm/client";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendHITLApproval } from "@/lib/telegram/notify";



export async function POST(req: NextRequest) {
  try {
    const { niche, market = "North America" } = await req.json();

    if (!niche) {
      return NextResponse.json({ error: "Niche required" }, { status: 400 });
    }

    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    let searchContext = "";

    // Step 1: Firecrawl web intelligence (if key is configured)
    if (firecrawlKey && firecrawlKey !== "placeholder") {
      try {
        const fcRes = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${firecrawlKey}`,
          },
          body: JSON.stringify({
            query: `${niche} SaaS market demand ${market} pricing 2024 2025`,
            limit: 5,
          }),
        });
        const fcData = await fcRes.json();
        const results = (fcData.data ?? []) as Array<{ url?: string; markdown?: string }>;
        if (results.length > 0) {
          searchContext = results
            .map((r) => `URL: ${r.url ?? "unknown"}\n${(r.markdown ?? "").slice(0, 600)}`)
            .join("\n\n---\n\n");
        }
      } catch (err) {
        console.error("[Scout Firecrawl]", err);
      }
    }

    // Step 2: Structured opportunity analysis
    const prompt = `You are the Scout Bee for CyberHound — an autonomous revenue agent. Analyze this market opportunity and return ONLY a valid JSON object.

Niche: ${niche}
Market: ${market}
${searchContext ? `\nWeb Intelligence:\n${searchContext}` : "\nUsing internal market knowledge (no web data available)."}

Return EXACTLY this JSON structure (no markdown, no explanation, just the JSON):
{
  "niche": "${niche}",
  "market": "${market}",
  "score": <integer 0-100, be honest — 70+ means genuinely strong opportunity>,
  "demand_signals": [<3-5 specific, concrete demand signals as strings>],
  "competition_level": "<low|medium|high>",
  "estimated_mrr_potential": "<e.g. $5K-$20K/mo>",
  "recommended_price_point": "<e.g. $97/mo or $297/mo>",
  "queen_reasoning": "<2-3 sentence strategic assessment of why this is or isn't a strong play>",
  "sources": ${searchContext ? '["web_search"]' : '[]'}
}`;

    const completion = await llm.chat.completions.create({
      model: LLM_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
      temperature: 0.2,
    });

    const rawResponse = completion.choices[0]?.message?.content ?? "{}";

    let opportunity: Record<string, unknown>;
    try {
      const cleaned = rawResponse
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      opportunity = JSON.parse(cleaned);
    } catch {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          opportunity = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json(
            { error: "Scout failed to parse analysis", raw: rawResponse },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Scout returned invalid format", raw: rawResponse },
          { status: 500 }
        );
      }
    }

    // Step 3: Persist to Supabase
    let opportunityId: string | null = null;
    let hiveLogId: string | null = null;

    try {
      const db = getSupabaseServer();

      // Insert opportunity
      const { data: oppRow, error: oppErr } = await db
        .from("opportunities")
        .insert({
          niche: String(opportunity.niche ?? niche),
          market: String(opportunity.market ?? market),
          score: Number(opportunity.score ?? 0),
          demand_signals: (opportunity.demand_signals as string[]) ?? [],
          competition_level: (opportunity.competition_level as string) ?? "medium",
          estimated_mrr_potential: String(opportunity.estimated_mrr_potential ?? "$0"),
          recommended_price_point: String(opportunity.recommended_price_point ?? "$0"),
          queen_reasoning: String(opportunity.queen_reasoning ?? ""),
          status: "pending_approval",
        })
        .select("id")
        .single();

      if (oppErr) console.error("[Scout DB opportunity]", oppErr);
      if (oppRow?.id) opportunityId = oppRow.id;

      // Log to hive
      const { data: logRow, error: logErr } = await db
        .from("hive_log")
        .insert({
          bee: "scout",
          action: `Scouted opportunity: ${niche} in ${market}`,
          details: { ...opportunity, opportunity_id: opportunityId },
          status: "pending_approval",
        })
        .select("id")
        .single();

      if (logErr) console.error("[Scout DB hive_log]", logErr);
      if (logRow?.id) hiveLogId = logRow.id;

      // Create HITL approval record
      if (hiveLogId) {
        const { error: hitlErr } = await db.from("hitl_approvals").insert({
          hive_log_id: hiveLogId,
          action_type: "approve_opportunity",
          payload: { opportunity_id: opportunityId, ...opportunity },
          status: "pending",
        });
        if (hitlErr) console.error("[Scout DB hitl]", hitlErr);
      }
    } catch (dbErr) {
      console.error("[Scout DB]", dbErr);
    }

    // Step 4: Send Telegram HITL alert (non-blocking)
    const score = Number(opportunity.score ?? 0);
    if (score >= 60) {
      sendHITLApproval({
        approvalId: opportunityId ?? `opp_${Date.now()}`,
        actionType: "approve_opportunity",
        summary: `${niche} — ${market}`,
        details: `📊 Score: ${score}/100\n💰 MRR Potential: ${opportunity.estimated_mrr_potential}\n💵 Price: ${opportunity.recommended_price_point}\n🏆 Competition: ${opportunity.competition_level}\n\n👑 ${opportunity.queen_reasoning}`,
      }).catch(console.error);
    }

    return NextResponse.json({ opportunity, opportunityId });
  } catch (error) {
    console.error("[Scout API]", error);
    return NextResponse.json({ error: "Scout Bee encountered an error" }, { status: 500 });
  }
}
