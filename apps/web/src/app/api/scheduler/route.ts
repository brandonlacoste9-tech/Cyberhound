/**
 * CyberHound — Scheduler Bee
 *
 * Manages automated follow-up email sequences.
 * Designed to be called by a cron job (Vercel Cron or external scheduler).
 *
 * Actions:
 *  tick        — Process all due follow-up sequences (send next email)
 *  status      — Get scheduler status + pending sequences
 *  pause       — Pause a specific sequence
 *  resume      — Resume a paused sequence
 *  cancel      — Cancel a sequence entirely
 *
 * Cron endpoint: GET /api/scheduler?action=tick&secret=SCHEDULER_SECRET
 * POST endpoint: POST /api/scheduler { action, sequence_id? }
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendHiveUpdate } from "@/lib/telegram/notify";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  last_sent_at: string | null;
  status: "active" | "paused" | "completed" | "cancelled" | "failed";
  sequence: SequenceEmail[];
  created_at: string;
}

// ── Personalize email ─────────────────────────────────────────────────────────

function personalizeEmail(template: string, seq: FollowUpSequence): string {
  const firstName = seq.recipient_name?.split(" ")[0] ?? "there";
  return template
    .replace(/\{\{FIRST_NAME\}\}/g, firstName)
    .replace(/\{\{COMPANY\}\}/g, seq.company ?? "your company");
}

// ── Process a single sequence step ───────────────────────────────────────────

async function processSequence(
  seq: FollowUpSequence,
  resend: Resend,
  db: ReturnType<typeof getSupabaseServer>
): Promise<{ success: boolean; message: string }> {
  const emailIndex = seq.current_step - 1; // current_step is 1-indexed
  const emailToSend: SequenceEmail | undefined = seq.sequence[emailIndex];

  if (!emailToSend) {
    // No more emails — mark as completed
    await db
      .from("follow_up_sequences")
      .update({ status: "completed" })
      .eq("id", seq.id);
    return { success: true, message: `Sequence ${seq.id} completed — no more emails` };
  }

  const personalizedSubject = personalizeEmail(emailToSend.subject, seq);
  const personalizedBody = personalizeEmail(emailToSend.body, seq);

  try {
    const { data, error } = await resend.emails.send({
      from: "Brandon | CyberHound <onboarding@resend.dev>",
      to: [seq.recipient_email],
      subject: personalizedSubject,
      text: personalizedBody,
    });

    if (error) {
      console.error(`[Scheduler] Resend error for seq ${seq.id}:`, error);
      await db
        .from("follow_up_sequences")
        .update({
          status: "failed",
          last_sent_at: new Date().toISOString(),
        })
        .eq("id", seq.id);
      return { success: false, message: `Send failed: ${error.message}` };
    }

    // Calculate next send time
    const nextStep = seq.current_step + 1;
    const nextEmail: SequenceEmail | undefined = seq.sequence[nextStep - 1];
    const isLastEmail = nextStep > seq.total_emails || !nextEmail;

    const nextSendAt = nextEmail
      ? (() => {
          const d = new Date();
          d.setDate(d.getDate() + (nextEmail.send_delay_days ?? 3));
          return d.toISOString();
        })()
      : null;

    // Update sequence state
    await db
      .from("follow_up_sequences")
      .update({
        sent_count: seq.sent_count + 1,
        current_step: nextStep,
        last_sent_at: new Date().toISOString(),
        next_send_at: nextSendAt,
        status: isLastEmail ? "completed" : "active",
      })
      .eq("id", seq.id);

    // Log to outreach_log
    await db.from("outreach_log").insert({
      campaign_id: seq.campaign_id,
      recipient_email: seq.recipient_email,
      recipient_name: seq.recipient_name,
      subject: personalizedSubject,
      sequence_number: seq.current_step,
      status: "sent",
      resend_id: data?.id ?? null,
    });

    // Update analyst_leads status if applicable
    if (seq.lead_id && isLastEmail) {
      await db
        .from("analyst_leads")
        .update({ status: "sent" })
        .eq("id", seq.lead_id);
    }

    return {
      success: true,
      message: `Email ${seq.current_step}/${seq.total_emails} sent to ${seq.recipient_email}${isLastEmail ? " — sequence complete" : ""}`,
    };
  } catch (sendErr) {
    console.error(`[Scheduler] Unexpected error for seq ${seq.id}:`, sendErr);
    return { success: false, message: `Unexpected error: ${(sendErr as Error).message}` };
  }
}

// ── GET handler (cron tick) ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "tick";
  const secret = searchParams.get("secret");
  const schedulerSecret = process.env.SCHEDULER_SECRET ?? "cyberhound-scheduler";

  // Validate cron secret
  if (secret !== schedulerSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (action === "tick") {
    return await runTick();
  }

  if (action === "status") {
    return await getStatus();
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// ── POST handler (manual control) ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sequence_id } = body;

    if (action === "tick") {
      return await runTick();
    }

    if (action === "status") {
      return await getStatus();
    }

    if (action === "pause" && sequence_id) {
      const db = getSupabaseServer();
      await db
        .from("follow_up_sequences")
        .update({ status: "paused" })
        .eq("id", sequence_id);
      return NextResponse.json({ success: true, message: `Sequence ${sequence_id} paused` });
    }

    if (action === "resume" && sequence_id) {
      const db = getSupabaseServer();
      await db
        .from("follow_up_sequences")
        .update({ status: "active" })
        .eq("id", sequence_id);
      return NextResponse.json({ success: true, message: `Sequence ${sequence_id} resumed` });
    }

    if (action === "cancel" && sequence_id) {
      const db = getSupabaseServer();
      await db
        .from("follow_up_sequences")
        .update({ status: "cancelled" })
        .eq("id", sequence_id);
      return NextResponse.json({ success: true, message: `Sequence ${sequence_id} cancelled` });
    }

    return NextResponse.json({ error: "Unknown action or missing sequence_id" }, { status: 400 });
  } catch (error) {
    console.error("[Scheduler API]", error);
    return NextResponse.json(
      { error: "Scheduler Bee error", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// ── Core tick function ────────────────────────────────────────────────────────

async function runTick(): Promise<NextResponse> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "Resend not configured" }, { status: 400 });
  }

  const db = getSupabaseServer();
  const resend = new Resend(resendKey);
  const now = new Date().toISOString();

  // Fetch all due sequences
  const { data: dueSequences, error } = await db
    .from("follow_up_sequences")
    .select("*")
    .eq("status", "active")
    .lte("next_send_at", now)
    .order("next_send_at", { ascending: true })
    .limit(50); // Process max 50 per tick to avoid timeout

  if (error) {
    console.error("[Scheduler] DB error:", error);
    return NextResponse.json({ error: "DB error", details: error.message }, { status: 500 });
  }

  if (!dueSequences || dueSequences.length === 0) {
    return NextResponse.json({
      processed: 0,
      message: "No sequences due for sending",
      next_check: "Run again in 1 hour",
    });
  }

  const results: Array<{ sequence_id: string; recipient: string; success: boolean; message: string }> = [];
  let successCount = 0;

  for (const seq of dueSequences as FollowUpSequence[]) {
    const result = await processSequence(seq, resend, db);
    results.push({
      sequence_id: seq.id,
      recipient: seq.recipient_email,
      success: result.success,
      message: result.message,
    });
    if (result.success) successCount++;
    // Small delay between sends to respect rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  // Log to hive
  await db.from("hive_log").insert({
    bee: "scheduler",
    action: `Tick: processed ${dueSequences.length} sequences, ${successCount} sent`,
    details: { results, processed: dueSequences.length, success: successCount },
    status: successCount > 0 ? "success" : "idle",
  });

  // Telegram notification if emails were sent
  if (successCount > 0) {
    const completedCount = results.filter((r) => r.message.includes("complete")).length;
    await sendHiveUpdate(
      `⏰ *Scheduler Bee Tick*\n\n` +
      `📧 Emails sent: ${successCount}/${dueSequences.length}\n` +
      `✅ Sequences completed: ${completedCount}\n` +
      `🔄 Still active: ${dueSequences.length - completedCount - (dueSequences.length - successCount)}\n\n` +
      `Next tick in 1 hour.`
    );
  }

  return NextResponse.json({
    processed: dueSequences.length,
    sent: successCount,
    failed: dueSequences.length - successCount,
    results,
  });
}

// ── Status function ───────────────────────────────────────────────────────────

async function getStatus(): Promise<NextResponse> {
  const db = getSupabaseServer();

  const { data: sequences } = await db
    .from("follow_up_sequences")
    .select("status, count")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const stats = {
    active: 0,
    paused: 0,
    completed: 0,
    cancelled: 0,
    failed: 0,
  };

  for (const seq of (sequences ?? []) as FollowUpSequence[]) {
    if (seq.status in stats) {
      stats[seq.status as keyof typeof stats]++;
    }
  }

  // Find next due sequence
  const { data: nextDue } = await db
    .from("follow_up_sequences")
    .select("next_send_at, recipient_email, current_step, total_emails")
    .eq("status", "active")
    .order("next_send_at", { ascending: true })
    .limit(1)
    .single();

  return NextResponse.json({
    stats,
    next_due: nextDue ?? null,
    total_sequences: sequences?.length ?? 0,
  });
}
