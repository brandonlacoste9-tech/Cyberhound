/**
 * CyberHound LLM Client
 *
 * Priority:
 *   1. OpenClaw Gateway  — local, port 18790 (OpenAI-compatible)
 *   2. DeepSeek API      — cloud fallback for Vercel production
 *
 * Set OPENCLAW_BASE_URL env var to enable OpenClaw in any environment.
 * In development mode, OpenClaw is always attempted first.
 */
import OpenAI from "openai";

// ── Config ───────────────────────────────────────────────────────────────────

const OPENCLAW_BASE =
  process.env.OPENCLAW_BASE_URL ?? "http://localhost:18790/v1";
const OPENCLAW_MODEL = process.env.OPENCLAW_MODEL ?? "default";
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? "openclaw";

const DEEPSEEK_BASE  = "https://api.deepseek.com/v1";
const DEEPSEEK_KEY   = process.env.DEEPSEEK_API_KEY ?? "";

// ── Legacy exports (backward compat with existing routes) ────────────────────

/** Primary client — DeepSeek cloud (always available on Vercel) */
export const llm = new OpenAI({
  apiKey: DEEPSEEK_KEY,
  baseURL: DEEPSEEK_BASE,
});

export const LLM_MODEL = "deepseek-chat";

// ── Smart chat function ───────────────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" | "text" };
}

/**
 * Send a chat completion.
 * In development or when OPENCLAW_BASE_URL is set, tries OpenClaw first.
 * Falls back to DeepSeek automatically.
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const { temperature = 0.7, max_tokens = 2048, response_format } = options;

  const tryOpenClaw =
    process.env.NODE_ENV === "development" ||
    !!process.env.OPENCLAW_BASE_URL;

  if (tryOpenClaw) {
    try {
      const client = new OpenAI({
        baseURL: OPENCLAW_BASE,
        apiKey: OPENCLAW_TOKEN,
        timeout: 8000,
      });
      const res = await client.chat.completions.create({
        model: OPENCLAW_MODEL,
        messages,
        temperature,
        max_tokens,
        ...(response_format ? { response_format } : {}),
      });
      const text = res.choices[0]?.message?.content ?? "";
      if (text) {
        console.log("[LLM] ✓ OpenClaw");
        return text;
      }
    } catch (e) {
      console.warn(
        "[LLM] OpenClaw unavailable → DeepSeek fallback:",
        (e as Error).message
      );
    }
  }

  // DeepSeek fallback
  if (!DEEPSEEK_KEY) {
    throw new Error("No LLM: OpenClaw unreachable and DEEPSEEK_API_KEY missing.");
  }
  const client = new OpenAI({ baseURL: DEEPSEEK_BASE, apiKey: DEEPSEEK_KEY });
  const res = await client.chat.completions.create({
    model: "deepseek-chat",
    messages,
    temperature,
    max_tokens,
    ...(response_format ? { response_format } : {}),
  });
  console.log("[LLM] ✓ DeepSeek");
  return res.choices[0]?.message?.content ?? "";
}

/** Convenience wrapper — single prompt with optional system message */
export async function ask(
  userPrompt: string,
  systemPrompt?: string,
  options?: ChatOptions
): Promise<string> {
  const messages: ChatMessage[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });
  return chat(messages, options);
}
