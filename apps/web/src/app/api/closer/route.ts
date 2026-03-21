import { NextRequest, NextResponse } from "next/server";
import { llm, LLM_MODEL } from "@/lib/llm/client";
import { Resend } from "resend";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendHITLApproval, sendHiveUpdate } from "@/lib/telegram/notify";

interface EmailSequenceItem {
  sequence_number: number;
  subject: string;
  body: string;
  send_delay_days: number;
  goal: string;
}

interface Recipient {
  name: string;
  email: string;
  company?: string;
  title?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { opportunity, campaign, action, recipients } = await req.json();
    const db = getSupabaseServer();

    // ──────────────────────────────────────────────
    // ACTION: generate_sequence
    // Generates 3-email sequence + sends HITL approval
    // ──────────────────────────────────────────────
    if (action === "generate_sequence") {
      const sequencePrompt = `You are the Closer Bee for CyberHound — an elite B2B outreach specialist.

Generate a 3-email cold outreach sequence for this campaign:
Niche: ${opportunity?.niche ?? "B2B SaaS"}
Market: ${opportunity?.market ?? "North America"}
Product: ${campaign?.name ?? "CyberHound Product"}
Price: ${opportunity?.recommended_price_point ?? "$97/mo"}
Value Prop: ${opportunity?.queen_reasoning ?? "Saves time and money"}
Payment Link: ${campaign?.payment_link ?? "{{PAYMENT_LINK}}"}

Rules:
- Short, punchy emails (max 150 words each)
- No corporate speak — conversational, direct, human
- Each email has a single clear CTA
- Subject lines under 50 chars, no clickbait
- Email 3 must include the payment link as a direct URL
- Use {{FIRST_NAME}} placeholder for personalization
- Use {{COMPANY}} placeholder for company name

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
    "body": "<closing body with payment link>",
    "send_delay_days": 7,
    "goal": "conversion"
  }
]`;

      const completion = await llm.chat.completions.create({
        model: LLM_MODEL,
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

      // Persist sequence to outreach_log
      const approvalId = `outreach_${Date.now()}`;
      const recipientCount = Array.isArray(recipients) ? recipients.length : 0;

      await db.from("outreach_log").insert({
        campaign_id: campaign?.id ?? null,
        sequence: sequence,
        status: "pending_approval",
        approval_id: approvalId,
        recipient_count: recipientCount,
        recipients: recipients ?? [],
      });

      // Log to hive
      await db.from("hive_log").insert({
        bee: "closer",
        action: `Generated 3-email sequence for: ${opportunity?.niche ?? campaign?.name}`,
        details: { sequence, recipient_count: recipientCount, approval_id: approvalId },
        status: "pending_approval",
      });

      // HITL gate — send to Telegram for approval
      await sendHITLApproval({
        approvalId,
        actionType: "send_outreach_sequence",
        summary: `3-email sequence for ${opportunity?.niche ?? campaign?.name}`,
        details: `📧 Recipients: ${recipientCount > 0 ? recipientCount : "TBD"}\n📬 Email 1: "${sequence[0]?.subject}"\n📬 Email 2: "${sequence[1]?.subject}" (+3d)\n📬 Email 3: "${sequence[2]?.subject}" (+7d)\n\n⚠️ Approve to send Email 1 immediately.`,
      });

      return NextResponse.json({
        sequence,
        hitl_required: true,
        approval_id: approvalId,
        message: "Sequence generated. HITL approval sent to Telegram — tap Approve to send.",
      });
    }

    // ──────────────────────────────────────────────
    // ACTION: send_sequence
    // Sends Email 1 immediately via Resend (post-HITL)
    // ──────────────────────────────────────────────
    if (action === "send_sequence") {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey || resendKey === "placeholder") {
        return NextResponse.json({ error: "Resend not configured" }, { status: 400 });
      }

      const resend = new Resend(resendKey);
      const recipientList: Recipient[] = Array.isArray(recipients) ? recipients : [];
      const sequence: EmailSequenceItem[] = campaign?.sequence ?? [];

      if (!sequence.length) {
        return NextResponse.json({ error: "No sequence provided" }, { status: 400 });
      }

      // Send Email 1 immediately
      const email1 = sequence[0];
      const results = [];

      for (const recipient of recipientList) {
        const personalizedBody = (email1.body ?? "")
          .replace(/\{\{FIRST_NAME\}\}/g, recipient.name.split(" ")[0])
          .replace(/\{\{COMPANY\}\}/g, recipient.company ?? "your company");

        const personalizedSubject = (email1.subject ?? "")
          .replace(/\{\{FIRST_NAME\}\}/g, recipient.name.split(" ")[0])
          .replace(/\{\{COMPANY\}\}/g, recipient.company ?? "your company");

        try {
          const { data, error } = await resend.emails.send({
            from: "CyberHound <onboarding@resend.dev>",
            to: [recipient.email],
            subject: personalizedSubject,
            text: personalizedBody,
          });

          if (error) {
            console.error("[Closer Resend]", error);
            results.push({ email: recipient.email, status: "failed", error: error.message });
          } else {
            results.push({ email: recipient.email, status: "sent", id: data?.id });

            // Log each send to outreach_log
            await db.from("outreach_log").insert({
              campaign_id: campaign?.id ?? null,
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              subject: personalizedSubject,
              sequence_number: 1,
              status: "sent",
              resend_id: data?.id ?? null,
            });
          }
        } catch (sendErr) {
          console.error("[Closer send error]", sendErr);
          results.push({ email: recipient.email, status: "error" });
        }
      }

      const sentCount = results.filter((r) => r.status === "sent").length;

      // Log to hive
      await db.from("hive_log").insert({
        bee: "closer",
        action: `Sent Email 1 to ${sentCount}/${recipientList.length} recipients`,
        details: { results, campaign_id: campaign?.id },
        status: sentCount > 0 ? "success" : "failed",
      });

      // Notify via Telegram
      await sendHiveUpdate(
        `📧 *Closer Bee Report*\n\nEmail 1 sent!\n✅ Delivered: ${sentCount}/${recipientList.length}\n📬 Subject: "${email1.subject}"\n\nEmail 2 scheduled for +3 days.`
      );

      return NextResponse.json({
        sent: sentCount,
        total: recipientList.length,
        results,
        next_email: sequence[1] ? `Email 2 scheduled: "${sequence[1].subject}" in ${sequence[1].send_delay_days} days` : null,
      });
    }

    // ──────────────────────────────────────────────
    // ACTION: send_single
    // Sends a single test email via Resend
    // ──────────────────────────────────────────────
    if (action === "send_single") {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey || resendKey === "placeholder") {
        return NextResponse.json({ error: "Resend not configured" }, { status: 400 });
      }

      const { to, subject, body } = await req.json().catch(() => ({ to: null, subject: null, body: null }));
      if (!to || !subject || !body) {
        return NextResponse.json({ error: "to, subject, body required" }, { status: 400 });
      }

      const resend = new Resend(resendKey);
      const { data, error } = await resend.emails.send({
        from: "CyberHound <onboarding@resend.dev>",
        to: [to],
        subject,
        text: body,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ sent: true, id: data?.id });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[Closer API]", error);
    return NextResponse.json({ error: "Closer Bee encountered an error" }, { status: 500 });
  }
}
