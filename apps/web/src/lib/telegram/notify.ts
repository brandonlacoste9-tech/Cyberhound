const TELEGRAM_API = "https://api.telegram.org";

interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

interface SendMessageOptions {
  text: string;
  parse_mode?: "Markdown" | "HTML";
  reply_markup?: {
    inline_keyboard: InlineKeyboardButton[][];
  };
}

export async function sendTelegramAlert(options: SendMessageOptions): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token === "placeholder" || chatId === "0") {
    console.log("[Telegram] Not configured — skipping alert:", options.text.slice(0, 80));
    return null;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: options.text,
        parse_mode: options.parse_mode ?? "Markdown",
        ...(options.reply_markup ? { reply_markup: options.reply_markup } : {}),
      }),
    });

    const data = await res.json();
    if (data.ok) {
      return String(data.result?.message_id ?? "");
    }
    console.error("[Telegram] Send failed:", data.description);
    return null;
  } catch (err) {
    console.error("[Telegram] Error:", err);
    return null;
  }
}

/** Send a HITL approval request with Approve / C'est pas chill buttons */
export async function sendHITLApproval({
  approvalId,
  actionType,
  summary,
  details,
}: {
  approvalId: string;
  actionType: string;
  summary: string;
  details: string;
}): Promise<string | null> {
  const text = `⚠️ *HITL Approval Required*\n\n*Action:* ${actionType}\n*Summary:* ${summary}\n\n${details}\n\n_Approve to execute. Veto to cancel._`;

  return sendTelegramAlert({
    text,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: `approve:${approvalId}` },
          { text: "🚫 C'est pas chill", callback_data: `veto:${approvalId}` },
        ],
      ],
    },
  });
}

/** Send a status update (no buttons) */
export async function sendHiveUpdate(message: string): Promise<void> {
  await sendTelegramAlert({ text: message });
}
