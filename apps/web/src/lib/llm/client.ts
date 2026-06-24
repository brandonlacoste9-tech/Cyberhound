/**
 * CyberHound LLM Client
 *
 * Use `chat()` or `ask()` for all bees — same routing everywhere.
 *
 * Priority:
 *   1. Ollama (local)    — when AI_PROVIDER=ollama or OLLAMA_BASE_URL set
 *   2. OpenClaw Gateway  — OpenAI-compatible (dev always tries; prod if OPENCLAW_BASE_URL set)
 *   3. DeepSeek API      — cloud fallback
 *
 * Perfect for fully autonomous local runs with no API costs.
 */
import OpenAI from "openai";

// ── Config ───────────────────────────────────────────────────────────────────

const OPENCLAW_BASE =
  process.env.OPENCLAW_BASE_URL ?? "http://localhost:18790/v1";
const OPENCLAW_MODEL = process.env.OPENCLAW_MODEL ?? "default";
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? "openclaw";

const DEEPSEEK_BASE  = "https://api.deepseek.com/v1";
const DEEPSEEK_KEY   = process.env.DEEPSEEK_API_KEY ?? "";

// Ollama (local) - set OLLAMA_BASE_URL or AI_PROVIDER=ollama
const OLLAMA_BASE = (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1").replace(/\/$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";
const OLLAMA_ENABLED = !!process.env.OLLAMA_BASE_URL || process.env.AI_PROVIDER?.toLowerCase() === "ollama";

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
  /** HTTP timeout per provider (ms). Default 90s. */
  timeoutMs?: number;
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
  const timeout = options.timeoutMs ?? 90_000;

  // 1. Ollama (local, free) - perfect for autonomous runs
  if (OLLAMA_ENABLED) {
    try {
      const client = new OpenAI({
        baseURL: OLLAMA_BASE,
        apiKey: "ollama",
        timeout,
      });
      const res = await client.chat.completions.create({
        model: OLLAMA_MODEL,
        messages,
        temperature,
        max_tokens,
        ...(response_format ? { response_format } : {}),
      });
      const text = res.choices[0]?.message?.content ?? "";
      if (text) {
        console.log(`[LLM] ✓ Ollama (${OLLAMA_MODEL})`);
        return text;
      }
    } catch (e) {
      console.warn("[LLM] Ollama unavailable, falling back:", (e as Error).message);
    }
  }

  const tryOpenClaw =
    process.env.NODE_ENV === "development" ||
    !!process.env.OPENCLAW_BASE_URL;

  if (tryOpenClaw) {
    try {
      const client = new OpenAI({
        baseURL: OPENCLAW_BASE,
        apiKey: OPENCLAW_TOKEN,
        timeout,
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
    throw new Error("No LLM: OpenClaw/Ollama unreachable and DEEPSEEK_API_KEY missing.");
  }
  const client = new OpenAI({
    baseURL: DEEPSEEK_BASE,
    apiKey: DEEPSEEK_KEY,
    timeout,
  });
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
