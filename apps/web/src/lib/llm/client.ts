/**
 * CyberHound LLM Client
 * Uses DeepSeek API (OpenAI-compatible) as the primary model.
 * Model: deepseek-chat (DeepSeek-V3 — fast, cheap, highly capable)
 */
import OpenAI from "openai";

export const llm = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
  baseURL: "https://api.deepseek.com/v1",
});

export const LLM_MODEL = "deepseek-chat";
