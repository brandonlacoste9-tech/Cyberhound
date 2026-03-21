import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { sendHITLApproval } from "@/lib/telegram/notify";

const client = new OpenAI();

interface EmailSequenceItem {
  sequence_number: number;
  subject: string;
  body: string;
  send_delay_days: number;
  goal: string;
}

export async function POST(req: NextRequest) {
  try {
    const { opportunity, campaign, action, recipients } = await req.json();

    // ──────────────────────────────────────────────
    // ACTION: generate_sequence
    // ──────────────────────────────────────────────
    if (action === "generate_sequence") {
      const sequencePrompt = `You are the Closer Bee for CyberHound — an elite B2B outreach specialist.

Generate a 3-email cold outreach sequence for this campaign:
Niche: ${opportunity?.niche ?? "B2B SaaS"}
Market: ${opportunity?.market ?? "North America"}
Product: ${campaign?.name ?? "CyberHound Product"}
Price: ${opportunity?.recommended_price_point ?? "$97/mo"}
Value Prop: ${opportunity?.queen_reasoning ?? "Saves time and money"}

Rules:
- Short, punchy emails (max 150 words each)
- No corporate speak — conversational, direct
- Each email has a single clear CTA
- Subject lines under 50 chars, no clickbait

Return ONLY a JSON array (no markdown):
[
  {
    "sequence_number": 1,
    "subject": "<subject line>",
    "body": "<email body with line breaks as \\n>",
    "send_delay_days": 0,
    "goal": "awareness"
  },
  {
    "sequence_number": 2,
    "subject": "<follow-up subject>",
    "body": "<follow-up body>",
    "send_delay_days": 3,
    "goal": "interest"
  },
  {
    "sequence_number": 3,
    "subject": "<closing subject>",
    "body": "<closing body with clear CTA and payment link placeholder: {{PAYMENT_LINK}}>",
    "send_delay_days": 7,
    "goal": "conversion"
  }
]`;

      const completion = await client.chat.completions.create({
        model: "gemini-2.5-flash",
        messages: [{ role: "user", content: sequencePrompt }],
        max_tokens: 2048,
        temperature: 0.7,
      });

      const rawResponse = completion.choices[0]?.message?.content ?? "[]";
      let sequence: EmailSequenceItem[];

      try {
        const cleaned = rawResponse.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        sequence = JSON.parse(cleaned);
      } catch {
        const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          sequence = JSON.parse(jsonMatch[0]);
        } else {
          return NextResponse.json({ error: "Failed to parse sequence", raw: rawResponse }, { status: 500 });
        }
      }

      // Always require HITL before sending outreach
      const approvalId = `outreach_${Date.now()}`;
      const recipientCount = Array.isArray(recipients) ? recipients.length : 0;

      await sendHITLApproval({
        approvalId,
        actionType: "send_outreach_sequence",
        summary: `3-email sequence for ${opportunity?.niche ?? "campaign"}`,
        details: `📧 Recipients: ${recipientCount > 0 ? recipientCount : "TBD"}\n📬 Email 1: "${sequence[0]?.subject}"\n📬 Email 2: "${sequence[1]?.subject}" (+3d)\n📬 Email 3: "${sequence[2]?.subject}" (+7d)\n\n⚠️ Approve to queue outreach.`,
      });

      // Log to hive
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && !supabaseUrl.includes("placeholder")) {
          const { createClient } = await import("@supabase/supabase-js");
          const db = createClient(supabaseUrl, supabaseKey!);
          await db.from("hive_log").insert({
            bee: "closer",
            action: `Generated outreach sequence for: ${opportunity?.niche}`,
            details: { sequence, recipient_count: recipientCount },
            status: "pending_approval",
          });
        }
      } catch (dbErr) {
        console.error("[Closer DB]", dbErr);
      }

      return NextResponse.json({
        sequence,
        hitl_required: true,
        approval_id: approvalId,
        message: "Sequence generated. HITL approval sent to Telegram before sending.",
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[Closer API]", error);
    return NextResponse.json({ error: "Closer Bee encountered an error" }, { status: 500 });
  }
}
