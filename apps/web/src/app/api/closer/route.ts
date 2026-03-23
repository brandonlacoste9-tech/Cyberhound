/**
 * Closer Bee v2 — Signal-Aware Hyper-Personalized Outreach
 *
 * New actions:
 *  from_lead  — Full pipeline: fetch analyst lead → generate signal-aware sequence → HITL
 *
 * Upgraded:
 *  generate_sequence — Now uses source/signal/pain_point/hook for hyper-personalization
 *  send_sequence     — Now creates follow_up_sequences entries + updates analyst_leads status
 */
import { NextRequest, NextResponse } from "next/server";
import { ask } from "@/lib/llm/client";
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
  // v2 signal fields
  linkedin?: string;
  pain_point?: string;
  signal_type?: string;
  source?: string;
  budget?: string;
  personalization_hook?: string;
  recommended_service?: string;
  lead_id?: string;
}

// ── Signal-aware prompt builder ───────────────────────────────────────────────
function buildSignalAwarePrompt(recipient: Recipient, opportunity?: Record<string, unknown>, campaign?: Record<string, unknown>): string {
  const source = recipient.source ?? "unknown";
  const signal = recipient.signal_type ?? "general inquiry";
  const painPoint = recipient.pain_point ?? "operational inefficiency";
  const hook = recipient.personalization_hook ?? "";
  const service = recipient.recommended_service ?? (opportunity?.niche as string) ?? "AI automation";
  const budget = recipient.budget ? `Budget mentioned: ${recipient.budget}` : "";
  const firstName = recipient.name?.split(" ")[0] ?? "there";

  const sourceContext: Record<string, string> = {
    upwork: "They posted a job on Upwork — they are actively buying RIGHT NOW. Be direct, reference their specific job post, and position as a premium alternative to hiring a freelancer.",
    churn: "They are frustrated with a competitor product and venting publicly. Lead with empathy, acknowledge their pain, then pivot to how CyberHound solves exactly what their current tool fails at.",
    reddit: "They shared a problem or asked for help on Reddit. They are in research/discovery mode. Be helpful and educational first, then introduce CyberHound as the solution they were looking for.",
  };

  const toneGuide = sourceContext[source] ?? `Professional B2B outreach. Niche: ${opportunity?.niche ?? "B2B SaaS"}. Market: ${opportunity?.market ?? "North America"}.`;

  return `You are the Closer Bee for CyberHound — an elite AI-powered outreach specialist.

Generate a 3-email cold outreach sequence for this warm lead:

LEAD INTEL:
- Name: ${firstName}
- Company: ${recipient.company ?? (campaign as Record<string, unknown>)?.name ?? "their company"}
- Title: ${recipient.title ?? "Decision Maker"}
- Source: ${source.toUpperCase()} (${signal})
- Pain Point: ${painPoint}
- Personalization Hook: ${hook}
- Recommended Service: ${service}
${budget}
${recipient.linkedin ? `- LinkedIn: ${recipient.linkedin}` : ""}
- Payment Link: ${(campaign as Record<string, unknown>)?.payment_link ?? "https://cyberhound.dev"}

TONE DIRECTIVE: ${toneGuide}

CYBERHOUND SERVICES:
- AI Automation Agents (custom workflows, n8n, Make.com replacement)
- Web Scraping & Lead Intelligence (Firecrawl-powered)
- Full-Stack Web App Development (Next.js, TypeScript)
- AI-Powered Analytics Dashboards
- Custom LLM Integrations (GPT-4, Claude, Gemini)

SEQUENCE STRUCTURE:
Email 1 (Day 0) — Pain Hook: Reference their EXACT signal, show you understand their problem, introduce CyberHound. CTA: 15-min call.
Email 2 (Day 3) — Social Proof + Value: Share a relevant result/case study. Reinforce ROI. Soft CTA.
Email 3 (Day 7) — Urgency Close: Final follow-up with urgency + payment link. Direct CTA.

RULES:
- Keep each email under 150 words
- No generic fluff — every sentence must earn its place
- Use {{FIRST_NAME}} and {{COMPANY}} as placeholders
- Subject lines must be curiosity-driven, not salesy
- Sign as: Brandon | CyberHound

Return ONLY valid JSON array:
[
  { "sequence_number": 1, "subject": "...", "body": "...", "send_delay_days": 0, "goal": "pain_hook" },
  { "sequence_number": 2, "subject": "...", "body": "...", "send_delay_days": 3, "goal": "social_proof" },
  { "sequence_number": 3, "subject": "...", "body": "...", "send_delay_days": 7, "goal": "urgency_close" }
]`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { opportunity, campaign, action, recipients } = body;
    const db = getSupabaseServer();

    // ──────────────────────────────────────────────
    // ACTION: generate_sequence
    // Generates 3-email sequence + sends HITL approval
    // ──────────────────────────────────────────────
    if (action === "generate_sequence") {
      // v2: Use signal-aware prompt if recipient has source/signal data
      const recipient: Recipient = Array.isArray(recipients) && recipients.length > 0
        ? recipients[0]
        : { name: "Decision Maker", email: "" };

      const sequencePrompt = buildSignalAwarePrompt(recipient, opportunity, campaign);

      const rawResponse = await ask(sequencePrompt, undefined, { temperature: 0.8, max_tokens: 2048 });
      let sequence: EmailSequenceItem[];

      try {
        const cleaned = rawResponse.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
        sequence = JSON.parse(jsonMatch?.[0] ?? cleaned);
      } catch {
        return NextResponse.json({ error: "Failed to parse sequence", raw: rawResponse }, { status: 500 });
      }

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

      await db.from("hive_log").insert({
        bee: "closer_v2",
        action: `Generated signal-aware sequence for: ${recipient.company ?? opportunity?.niche ?? campaign?.name}`,
        details: { sequence, recipient_count: recipientCount, approval_id: approvalId, source: recipient.source, signal_type: recipient.signal_type },
        status: "pending_approval",
      });

      const sourceEmoji: Record<string, string> = { upwork: "💼", churn: "🔄", reddit: "🔴" };
      const emoji = sourceEmoji[recipient.source ?? ""] ?? "📡";

      await sendHITLApproval({
        approvalId,
        actionType: "send_outreach_sequence",
        summary: `${emoji} Signal-aware sequence for ${recipient.company ?? opportunity?.niche ?? campaign?.name}`,
        details: `👤 ${recipient.name} @ ${recipient.company ?? "Unknown"}\n📡 Source: ${(recipient.source ?? "unknown").toUpperCase()} — ${recipient.signal_type ?? ""}\n🎯 Service: ${recipient.recommended_service ?? opportunity?.niche ?? "AI Automation"}\n🔥 Hook: ${(recipient.personalization_hook ?? "").slice(0, 80)}\n\n📬 Email 1: "${sequence[0]?.subject}"\n📬 Email 2: "${sequence[1]?.subject}" (+3d)\n📬 Email 3: "${sequence[2]?.subject}" (+7d)\n\n⚠️ Approve to send Email 1 immediately.`,
      });

      return NextResponse.json({
        sequence,
        hitl_required: true,
        approval_id: approvalId,
        message: "Signal-aware sequence generated. HITL approval sent to Telegram — tap Approve to send.",
      });
    }

    // ──────────────────────────────────────────────
    // ACTION: from_lead (NEW in v2)
    // Full pipeline: fetch analyst lead → generate → HITL
    // ──────────────────────────────────────────────
    if (action === "from_lead") {
      const { lead_id } = body;
      if (!lead_id) {
        return NextResponse.json({ error: "lead_id required" }, { status: 400 });
      }

      const { data: lead, error: leadError } = await db
        .from("analyst_leads")
        .select("*")
        .eq("id", lead_id)
        .single();

      if (leadError || !lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }

      if (!lead.contact_email) {
        return NextResponse.json(
          { error: "Lead not enriched yet. Run /api/enrich first.", lead_id },
          { status: 400 }
        );
      }

      const leadRecipient: Recipient = {
        email: lead.contact_email,
        name: lead.contact_name ?? "Decision Maker",
        company: lead.company,
        title: "CEO/Founder",
        linkedin: lead.contact_linkedin,
        pain_point: lead.pain_point,
        signal_type: lead.signal_type,
        source: lead.source,
        budget: lead.budget,
        personalization_hook: lead.personalization_hook,
        recommended_service: lead.recommended_service,
        lead_id: lead.id,
      };

      const prompt = buildSignalAwarePrompt(leadRecipient, undefined, undefined);
      const rawLead = await ask(prompt, undefined, { temperature: 0.8, max_tokens: 2048 });

      let leadSequence: EmailSequenceItem[];
      try {
        const jsonMatch = rawLead.match(/\[[\s\S]*\]/);
        leadSequence = JSON.parse(jsonMatch?.[0] ?? rawLead);
      } catch {
        return NextResponse.json({ error: "LLM returned invalid JSON", raw: rawLead }, { status: 500 });
      }

      const leadApprovalId = `lead_${lead_id}_${Date.now()}`;

      await db.from("hive_log").insert({
        bee: "closer_v2",
        action: "from_lead_sequence_generated",
        details: { approval_id: leadApprovalId, lead_id, recipient: leadRecipient, sequence: leadSequence },
        status: "pending",
      });

      await db.from("analyst_leads").update({ status: "queued" }).eq("id", lead_id);

      const srcEmoji: Record<string, string> = { upwork: "💼", churn: "🔄", reddit: "🔴" };
      const leadEmoji = srcEmoji[lead.source ?? ""] ?? "📡";

      await sendHITLApproval({
        approvalId: leadApprovalId,
        actionType: "send_outreach_sequence",
        summary: `${leadEmoji} Lead sequence: ${leadRecipient.name} @ ${leadRecipient.company ?? "Unknown"}`,
        details: `📡 Source: ${(lead.source ?? "").toUpperCase()} — ${lead.signal_type ?? ""}\n🎯 Pain: ${(lead.pain_point ?? "").slice(0, 80)}\n🔥 Hook: ${(lead.personalization_hook ?? "").slice(0, 80)}\n\n📬 Email 1: "${leadSequence[0]?.subject}"\n📬 Email 2: "${leadSequence[1]?.subject}" (+3d)\n📬 Email 3: "${leadSequence[2]?.subject}" (+7d)\n\n⚠️ Approve to send Email 1 immediately.`,
      });

      return NextResponse.json({
        sequence: leadSequence,
        hitl_required: true,
        approval_id: leadApprovalId,
        lead_id,
        message: "Sequence generated from analyst lead. Awaiting HITL approval.",
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

            // Update analyst_leads status if lead_id provided
            if ((recipient as Recipient).lead_id) {
              await db
                .from("analyst_leads")
                .update({ status: "sent" })
                .eq("id", (recipient as Recipient).lead_id);
            }

            // Create follow_up_sequences entry for Email 2 and 3
            if (sequence.length > 1) {
              const nextEmail = sequence[1];
              const nextSendAt = new Date();
              nextSendAt.setDate(nextSendAt.getDate() + (nextEmail.send_delay_days ?? 3));
              await db.from("follow_up_sequences").insert({
                lead_id: (recipient as Recipient).lead_id ?? null,
                campaign_id: campaign?.id ?? null,
                recipient_email: recipient.email,
                recipient_name: recipient.name,
                company: recipient.company ?? null,
                total_emails: sequence.length,
                sent_count: 1,
                current_step: 2,
                next_send_at: nextSendAt.toISOString(),
                last_sent_at: new Date().toISOString(),
                status: "active",
                sequence: sequence as unknown as never,
              });
            }
          }
        } catch (sendErr) {
          console.error("[Closer send error]", sendErr);
          results.push({ email: recipient.email, status: "error" });
        }
      }

      const sentCount = results.filter((r) => r.status === "sent").length;

      // Log to hive
      await db.from("hive_log").insert({
        bee: "closer_v2",
        action: `Sent Email 1 to ${sentCount}/${recipientList.length} recipients`,
        // follow-ups scheduled:
        details: { results, campaign_id: campaign?.id },
        status: sentCount > 0 ? "success" : "failed",
      });

      // Notify via Telegram
      await sendHiveUpdate(
        `📧 *Closer Bee v2 — Email 1 Sent*\n\n✅ Delivered: ${sentCount}/${recipientList.length}\n📬 Subject: "${email1.subject}"\n🔄 Follow-ups: ${sequence.length - 1} scheduled\n\nEmail 2 fires in ${sequence[1]?.send_delay_days ?? 3} days.`
      );

      return NextResponse.json({
        sent: sentCount,
        total: recipientList.length,
        results,
        follow_ups_scheduled: sequence.length - 1,
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
    console.error("[Closer v2 API]", error);
    return NextResponse.json({ error: "Closer Bee v2 encountered an error", details: (error as Error).message }, { status: 500 });
  }
}
