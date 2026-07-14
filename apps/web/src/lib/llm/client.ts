/**
 * CyberHound LLM Client
 *
 * Use `chat()` or `ask()` for all bees — same routing everywhere.
 *
 * Priority:
 *   1. Ollama (local)     — AI_PROVIDER=ollama or OLLAMA_BASE_URL
 *   2. OpenClaw Gateway   — OPENCLAW_BASE_URL (dev tries localhost)
 *   3. OpenAI             — OPENAI_API_KEY
 *   4. Gemini             — GEMINI_API_KEY (OpenAI-compatible endpoint)
 *   5. DeepSeek           — DEEPSEEK_API_KEY
 *
 * Providers that return 402/429 are skipped and we fall through.
 */
import OpenAI from "openai";

// ── Config ───────────────────────────────────────────────────────────────────

const OPENCLAW_BASE =
  process.env.OPENCLAW_BASE_URL ?? "http://localhost:18790/v1";
const OPENCLAW_MODEL = process.env.OPENCLAW_MODEL ?? "default";
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? "openclaw";

const DEEPSEEK_BASE = "https://api.deepseek.com/v1";
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? "";

const OPENAI_KEY = process.env.OPENAI_API_KEY ?? "";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const GEMINI_KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/openai/";

const OLLAMA_BASE = (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1").replace(
  /\/$/,
  ""
);
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";
const OLLAMA_ENABLED =
  !!process.env.OLLAMA_BASE_URL ||
  process.env.AI_PROVIDER?.toLowerCase() === "ollama";

// ── Legacy exports ───────────────────────────────────────────────────────────

/** Primary client — DeepSeek cloud (may be empty key) */
export const llm = new OpenAI({
  apiKey: DEEPSEEK_KEY || "missing",
  baseURL: DEEPSEEK_BASE,
});

export const LLM_MODEL = "deepseek-chat";

// ── Types ────────────────────────────────────────────────────────────────────

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

export type LlmProviderId =
  | "ollama"
  | "openclaw"
  | "openai"
  | "gemini"
  | "deepseek";

function isBillingOrQuotaError(err: unknown): boolean {
  const e = err as { status?: number; code?: string; message?: string };
  const msg = String(e?.message ?? err ?? "").toLowerCase();
  if (e?.status === 402 || e?.status === 429) return true;
  if (msg.includes("insufficient balance") || msg.includes("insufficient_quota"))
    return true;
  if (msg.includes("quota") || msg.includes("billing") || msg.includes("credit"))
    return true;
  return false;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function completeWith(
  label: LlmProviderId,
  client: OpenAI,
  model: string,
  messages: ChatMessage[],
  options: {
    temperature: number;
    max_tokens: number;
    response_format?: ChatOptions["response_format"];
  }
): Promise<string | null> {
  try {
    const res = await client.chat.completions.create({
      model,
      messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      ...(options.response_format ? { response_format: options.response_format } : {}),
    });
    const text = res.choices[0]?.message?.content ?? "";
    if (text) {
      console.log(`[LLM] ✓ ${label} (${model})`);
      return text;
    }
    console.warn(`[LLM] ${label} returned empty content`);
    return null;
  } catch (e) {
    if (isBillingOrQuotaError(e)) {
      console.warn(`[LLM] ${label} billing/quota error — skipping:`, errMsg(e));
    } else {
      console.warn(`[LLM] ${label} unavailable:`, errMsg(e));
    }
    return null;
  }
}

/** Which providers have credentials configured (not necessarily reachable). */
export function configuredProviders(): LlmProviderId[] {
  const out: LlmProviderId[] = [];
  if (OLLAMA_ENABLED) out.push("ollama");
  if (process.env.NODE_ENV === "development" || process.env.OPENCLAW_BASE_URL)
    out.push("openclaw");
  if (OPENAI_KEY && OPENAI_KEY !== "placeholder") out.push("openai");
  if (GEMINI_KEY && GEMINI_KEY !== "placeholder") out.push("gemini");
  if (DEEPSEEK_KEY && DEEPSEEK_KEY !== "placeholder") out.push("deepseek");
  return out;
}

/**
 * Send a chat completion across providers with graceful fallthrough.
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const { temperature = 0.7, max_tokens = 2048, response_format } = options;
  const timeout = options.timeoutMs ?? 90_000;
  const opts = { temperature, max_tokens, response_format };
  const errors: string[] = [];

  // 1. Ollama (local, free)
  if (OLLAMA_ENABLED) {
    const client = new OpenAI({
      baseURL: OLLAMA_BASE,
      apiKey: "ollama",
      timeout,
    });
    const text = await completeWith("ollama", client, OLLAMA_MODEL, messages, opts);
    if (text) return text;
    errors.push("ollama failed");
  }

  // 2. OpenClaw
  const tryOpenClaw =
    process.env.NODE_ENV === "development" || !!process.env.OPENCLAW_BASE_URL;
  if (tryOpenClaw) {
    const client = new OpenAI({
      baseURL: OPENCLAW_BASE,
      apiKey: OPENCLAW_TOKEN,
      timeout,
    });
    const text = await completeWith(
      "openclaw",
      client,
      OPENCLAW_MODEL,
      messages,
      opts
    );
    if (text) return text;
    errors.push("openclaw failed");
  }

  // 3. OpenAI
  if (OPENAI_KEY && OPENAI_KEY !== "placeholder") {
    const client = new OpenAI({ apiKey: OPENAI_KEY, timeout });
    const text = await completeWith("openai", client, OPENAI_MODEL, messages, opts);
    if (text) return text;
    errors.push("openai failed");
  }

  // 4. Gemini (OpenAI-compatible)
  if (GEMINI_KEY && GEMINI_KEY !== "placeholder") {
    const client = new OpenAI({
      apiKey: GEMINI_KEY,
      baseURL: GEMINI_BASE,
      timeout,
    });
    const text = await completeWith("gemini", client, GEMINI_MODEL, messages, opts);
    if (text) return text;
    errors.push("gemini failed");
  }

  // 5. DeepSeek
  if (DEEPSEEK_KEY && DEEPSEEK_KEY !== "placeholder") {
    const client = new OpenAI({
      baseURL: DEEPSEEK_BASE,
      apiKey: DEEPSEEK_KEY,
      timeout,
    });
    const text = await completeWith(
      "deepseek",
      client,
      "deepseek-chat",
      messages,
      opts
    );
    if (text) return text;
    errors.push("deepseek failed (check balance — 402 common)");
  }

  throw new Error(
    `No LLM available. Configured: [${configuredProviders().join(", ") || "none"}]. ` +
      `Tried: ${errors.join("; ") || "nothing"}. ` +
      `Set OLLAMA / OPENAI_API_KEY / GEMINI_API_KEY / DEEPSEEK_API_KEY.`
  );
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
