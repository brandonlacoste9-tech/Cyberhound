/**
 * CyberHound — Cron: Scheduler Tick
 *
 * Called by Vercel Cron every hour.
 * Vercel automatically adds Authorization: Bearer <CRON_SECRET> on cron calls.
 * Add CRON_SECRET env var to your Vercel project to match.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { Resend } from "resend";
import { sendHiveUpdate } from "@/lib/telegram/notify";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Pro: up to 300s

interface SequenceEmail {
  sequence_number: number;
  subject: string;
  body: string;
  send_delay_days: number;
  goal: string;
}

interface FollowUpSequence {
  id: string;
  lead_id: string | null;
  campaign_id: string | null;
  recipient_email: string;
  recipient_name: string;
  company: string | null;
  total_emails: number;
  sent_count: number;
  current_step: number;
  next_send_at: string;
  status: "active" | "paused" | "completed" | "cancelled" | "failed";
  sequence: SequenceEmail[];
}

function personalize(template: string, seq: FollowUpSequence): string {
  const firstName = seq.recipient_name?.split(" ")[0] ?? "there";
  return template
    .replace(/\{\{FIRST_NAME\}\}/g, firstName)
    .replace(/\{\{COMPANY\}\}/g, seq.company ?? "your company");
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET ?? process.env.SCHEDULER_SECRET ?? "cyberhound-scheduler";

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || resendKey === "re_placeholder") {
    return NextResponse.json({ skipped: true, reason: "Resend not configured" });
  }

  const db = getSupabaseServer();
  const resend = new Resend(resendKey);
  const now = new Date().toISOString();

  const { data: dueSequences, error } = await db
    .from("follow_up_sequences")
    .select("*")
    .eq("status", "active")
    .lte("next_send_at", now)
    .order("next_send_at", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!dueSequences?.length) {
    return NextResponse.json({ processed: 0, message: "No sequences due" });
  }

  let successCount = 0;
  const results: Array<{ id: string; recipient: string; success: boolean; step: number }> = [];

  for (const seq of dueSequences as FollowUpSequence[]) {
    const emailIndex = seq.current_step - 1;
    const emailToSend = seq.sequence[emailIndex];
    if (!emailToSend) {
      await db.from("follow_up_sequences").update({ status: "completed" }).eq("id", seq.id);
      continue;
    }

    try {
      const { data, error: sendErr } = await resend.emails.send({
        from: "Brandon | CyberHound <cyberhound@adgenai.ca>",
        to: [seq.recipient_email],
        subject: personalize(emailToSend.subject, seq),
        text: personalize(emailToSend.body, seq),
      });

      if (sendErr) throw new Error(sendErr.message);

      const nextStep = seq.current_step + 1;
      const nextEmail = seq.sequence[nextStep - 1];
      const isLast = nextStep > seq.total_emails || !nextEmail;
      const nextSendAt = nextEmail
        ? (() => { const d = new Date(); d.setDate(d.getDate() + (nextEmail.send_delay_days ?? 3)); return d.toISOString(); })()
        : null;

      await db.from("follow_up_sequences").update({
        sent_count: seq.sent_count + 1,
        current_step: nextStep,
        last_sent_at: new Date().toISOString(),
        next_send_at: nextSendAt,
        status: isLast ? "completed" : "active",
      }).eq("id", seq.id);

      await db.from("outreach_log").insert({
        campaign_id: seq.campaign_id,
        recipient_email: seq.recipient_email,
        recipient_name: seq.recipient_name,
        subject: personalize(emailToSend.subject, seq),
        sequence_number: seq.current_step,
        status: "sent",
        resend_id: data?.id ?? null,
      });

      if (seq.lead_id && isLast) {
        await db.from("analyst_leads").update({ status: "sent" }).eq("id", seq.lead_id);
      }

      results.push({ id: seq.id, recipient: seq.recipient_email, success: true, step: seq.current_step });
      successCount++;
    } catch {
      results.push({ id: seq.id, recipient: seq.recipient_email, success: false, step: seq.current_step });
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  await db.from("hive_log").insert({
    bee: "scheduler",
    action: `Cron tick: ${successCount}/${dueSequences.length} emails sent`,
    details: { results, processed: dueSequences.length, success: successCount },
    status: successCount > 0 ? "success" : "idle",
  });

  if (successCount > 0) {
    await sendHiveUpdate(
      `⏰ *Scheduler Cron Tick*\n\n📧 Sent: ${successCount}/${dueSequences.length}\n✅ Completed: ${results.filter(r => r.success).length}`
    );
  }

  return NextResponse.json({ processed: dueSequences.length, sent: successCount, results });
}
