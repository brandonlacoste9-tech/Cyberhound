import { NextRequest, NextResponse } from "next/server";

const OPENCLAW_PORT = process.env.OPENCLAW_PORT || "18790";
const OPENCLAW_BASE = process.env.OPENCLAW_BASE_URL || `http://localhost:${OPENCLAW_PORT}`;

export async function GET() {
  const start = Date.now();

  try {
    // Ping OpenClaw health endpoint (OpenAI-compatible /v1/models)
    const res = await fetch(`${OPENCLAW_BASE}/v1/models`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
      headers: { "Content-Type": "application/json" },
    });

    const latency = Date.now() - start;

    if (res.ok) {
      let models: string[] = [];
      try {
        const data = await res.json();
        models = (data.data || []).map((m: { id: string }) => m.id).slice(0, 5);
      } catch {
        models = ["unknown"];
      }

      return NextResponse.json({
        status: "online",
        latency,
        port: OPENCLAW_PORT,
        base_url: OPENCLAW_BASE,
        models,
        message: `The Wasp is live — ${latency}ms`,
      });
    } else {
      return NextResponse.json({
        status: "degraded",
        latency,
        port: OPENCLAW_PORT,
        base_url: OPENCLAW_BASE,
        models: [],
        message: `OpenClaw responded with ${res.status}`,
      });
    }
  } catch (err: unknown) {
    const latency = Date.now() - start;
    const message = err instanceof Error ? err.message : "Connection refused";

    return NextResponse.json({
      status: "offline",
      latency,
      port: OPENCLAW_PORT,
      base_url: OPENCLAW_BASE,
      models: [],
      message: `The Wasp is offline — ${message}`,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, model } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    const targetModel = model || "gpt-oss:20b-cloud";

    const res = await fetch(`${OPENCLAW_BASE}/v1/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      content: data.choices?.[0]?.message?.content || "",
      model: targetModel,
      usage: data.usage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Wasp unreachable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
