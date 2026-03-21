import { NextRequest, NextResponse } from "next/server";
import { sendHiveUpdate } from "@/lib/telegram/notify";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; username?: string; first_name?: string };
    chat: { id: number };
    text?: string;
    date: number;
  };
  callback_query?: {
    id: string;
    from: { id: number; username?: string };
    message: { message_id: number; chat: { id: number }; text?: string };
    data?: string;
  };
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = parseInt(process.env.TELEGRAM_CHAT_ID ?? "0");

async function sendMessage(chatId: number, text: string, replyMarkup?: object) {
  if (!BOT_TOKEN || BOT_TOKEN === "placeholder") return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
}

async function answerCallback(callbackId: string, text: string) {
  if (!BOT_TOKEN || BOT_TOKEN === "placeholder") return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

async function updateHITLStatus(approvalId: string, status: "approved" | "vetoed") {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || supabaseUrl.includes("placeholder")) return;

  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(supabaseUrl, supabaseKey!);

  await db
    .from("hitl_approvals")
    .update({ status, decided_at: new Date().toISOString() })
    .eq("telegram_message_id", approvalId);

  await db.from("hive_log").insert({
    bee: "queen",
    action: `HITL decision: ${status} for ${approvalId}`,
    details: { approval_id: approvalId, decision: status },
    status: status === "approved" ? "success" : "vetoed",
  });
}

async function getQueenResponse(userMessage: string): Promise<string> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/queen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage }),
    });
    const data = await res.json();
    return data.response ?? "Queen Bee is processing...";
  } catch {
    return "⚠️ Queen Bee connection error.";
  }
}

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json();

    // ── Callback query (button press) ──
    if (update.callback_query) {
      const { id: cbId, from, message, data } = update.callback_query;
      const chatId = message.chat.id;

      // Security: only admin
      if (ADMIN_CHAT_ID && from.id !== ADMIN_CHAT_ID) {
        await answerCallback(cbId, "❌ Unauthorized");
        return NextResponse.json({ ok: true });
      }

      if (data?.startsWith("approve:")) {
        const approvalId = data.replace("approve:", "");
        await answerCallback(cbId, "✅ Approved — Hive executing");
        await updateHITLStatus(approvalId, "approved");
        await sendMessage(
          chatId,
          `✅ *Approved*\n\nID: \`${approvalId}\`\n\nCyberHound is executing the action now. I'll update you when it's done.`
        );
      } else if (data?.startsWith("veto:")) {
        const approvalId = data.replace("veto:", "");
        await answerCallback(cbId, "🚫 C'est pas chill — vetoed");
        await updateHITLStatus(approvalId, "vetoed");
        await sendMessage(
          chatId,
          `🚫 *C'est pas chill*\n\nAction \`${approvalId}\` has been vetoed.\n\nHound standing down. The opportunity has been archived.`
        );
      }

      return NextResponse.json({ ok: true });
    }

    // ── Text messages ──
    if (update.message?.text) {
      const { text, chat, from } = update.message;
      const chatId = chat.id;

      // Security: only admin can control the hound
      if (ADMIN_CHAT_ID && from.id !== ADMIN_CHAT_ID) {
        await sendMessage(chatId, "🔒 Unauthorized. This is a private CyberHound instance.");
        return NextResponse.json({ ok: true });
      }

      const cmd = text.trim().toLowerCase();

      if (cmd === "/start") {
        await sendMessage(
          chatId,
          `🐕 *CyberHound v1.0 online*\n\nI'm your autonomous revenue agent. I'll ping you here for approvals before executing any critical actions.\n\n*Commands:*\n/status — Hive status\n/mrr — Current MRR\n/hunt — Start autonomous scouting\n/pause — Pause all agents\n/resume — Resume agents\n/help — Show all commands\n\nOr just talk to me — I'll route your message to Queen Bee.`
        );
      } else if (cmd === "/status") {
        await sendMessage(
          chatId,
          `🐝 *Hive Status*\n\n👑 Queen Bee: Active\n🔍 Scout Bee: Idle\n🔨 Builder Bee: Standby\n💬 Closer Bee: Standby\n💰 Treasurer Bee: Active\n\n📊 MRR: $0\n🎯 Opportunities: 0 pending\n✅ Campaigns: 0 live`
        );
      } else if (cmd === "/mrr") {
        await sendMessage(chatId, `💰 *Revenue Report*\n\nTotal MRR: $0\nARR: $0\nActive Subscriptions: 0\nNet Revenue (30d): $0\n\n_No revenue events yet. Launch your first campaign._`);
      } else if (cmd === "/hunt") {
        await sendMessage(chatId, `🎯 *Autonomous scouting initiated*\n\nQueen Bee is scanning North American markets...\n\nI'll send you the top opportunity for approval shortly.`);
        // Trigger async scout
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        fetch(`${baseUrl}/api/scout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            niche: "B2B SaaS for trades and construction",
            market: "North America",
          }),
        }).catch(console.error);
      } else if (cmd === "/pause") {
        await sendMessage(chatId, `⏸ *Hound paused*\n\nAll agents suspended. Send /resume to restart.`);
      } else if (cmd === "/resume") {
        await sendMessage(chatId, `▶️ *Hound resumed*\n\nAll agents back online. Hunting for MRR...`);
      } else if (cmd === "/help") {
        await sendMessage(
          chatId,
          `🐕 *CyberHound Commands*\n\n/start — Initialize\n/status — Hive status\n/mrr — Revenue report\n/hunt — Start autonomous scouting\n/pause — Pause all agents\n/resume — Resume agents\n\n_Or send any message to talk directly to Queen Bee._`
        );
      } else {
        // Route to Queen Bee
        await sendMessage(chatId, `👑 _Queen Bee processing..._`);
        const response = await getQueenResponse(text);
        // Truncate for Telegram (4096 char limit)
        const truncated = response.length > 3800 ? response.slice(0, 3800) + "..." : response;
        await sendMessage(chatId, `👑 *Queen Bee:*\n\n${truncated}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Telegram Webhook]", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "CyberHound Telegram webhook active",
    version: "1.0.0",
    bees: ["queen", "scout", "builder", "closer", "treasurer"],
  });
}
