"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Zap, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "queen" | "user";
  content: string;
  timestamp: Date;
}

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "queen",
    content:
      "🐝 Queen Bee online. CyberHound v1.0 initialized. I'm scanning North American markets for high-MRR opportunities.\n\nAwaiting your directive — or type \"hunt\" to begin autonomous scouting.",
    timestamp: new Date(),
  },
];

const QUICK_COMMANDS = [
  { label: "🎯 Hunt opportunities",  prompt: "Scout North American markets for 3 high-MRR SaaS opportunities. Rank them by score and give me your top pick." },
  { label: "💰 Revenue strategy",    prompt: "What's the fastest path to $10K MRR given our current Colony OS stack? Be specific." },
  { label: "🔍 Validate niche",      prompt: "Validate: AI-powered permit tracking for Canadian general contractors. Score it and give me a go/no-go." },
  { label: "🚀 Build plan",          prompt: "Give me a 30-day execution plan to launch a SaaS in the trades space and hit $5K MRR." },
];

export function HoundBrain() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [history, setHistory] = useState<HistoryMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autonomous, setAutonomous] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const newHistory: HistoryMessage[] = [...history, { role: "user", content: text.trim() }];

    try {
      const res = await fetch("/api/queen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history }),
      });
      const data = await res.json();
      const responseText = data.response ?? "Queen Bee is processing...";

      const queenMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "queen",
        content: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, queenMsg]);
      setHistory([...newHistory, { role: "assistant", content: responseText }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "queen",
          content: "⚠️ Hive connection error. Check API configuration in Settings.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function toggleAutonomous() {
    if (!autonomous) {
      setAutonomous(true);
      sendMessage(
        "Enter autonomous mode. Begin scanning North American markets for the highest-MRR opportunity right now. Identify the niche, score it, and tell me what action you want to take next. Flag anything that needs my approval."
      );
    } else {
      setAutonomous(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "queen",
          content: "⏸ Autonomous mode paused. Awaiting your directive.",
          timestamp: new Date(),
        },
      ]);
    }
  }

  return (
    <div
      className="rounded-xl flex flex-col"
      style={{
        height: "480px",
        background: "var(--bg-card)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* ── Header ──────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-5 py-4 border-b shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "rgba(251,191,36,0.15)",
            border: "1px solid rgba(251,191,36,0.3)",
          }}
        >
          <Zap className="w-4 h-4" style={{ color: "var(--amber-400)" }} />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            Queen Bee
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Strategic orchestrator
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {/* Autonomous toggle */}
          <button
            onClick={toggleAutonomous}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={
              autonomous
                ? { background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }
                : { background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", color: "var(--amber-400)" }
            }
          >
            {autonomous ? <><Square className="w-3 h-3" /> Stop</> : <><Play className="w-3 h-3" /> Auto</>}
          </button>
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full hound-pulse"
              style={{ background: autonomous ? "var(--status-hunting)" : "var(--status-closing)" }}
            />
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              {autonomous ? "Hunting" : "Live"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Messages ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className="max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
              style={
                msg.role === "queen"
                  ? {
                      background: "rgba(251,191,36,0.07)",
                      border: "1px solid rgba(251,191,36,0.14)",
                      color: "var(--text-primary)",
                    }
                  : {
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "var(--text-primary)",
                    }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm"
              style={{
                background: "rgba(251,191,36,0.07)",
                border: "1px solid rgba(251,191,36,0.14)",
                color: "var(--text-muted)",
              }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Queen Bee thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick commands ──────────────────────────── */}
      {messages.length <= 2 && !loading && (
        <div className="px-5 pb-3 flex flex-wrap gap-2">
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd.label}
              onClick={() => sendMessage(cmd.prompt)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
              style={{
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.16)",
                color: "var(--amber-400)",
              }}
            >
              {cmd.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Input ───────────────────────────────────── */}
      <div
        className="px-5 py-4 border-t shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Direct the Queen Bee... or let her hunt autonomously"
            className="flex-1 bg-transparent text-sm outline-none border-none"
            style={{
              color: "var(--text-primary)",
              padding: 0,
              background: "transparent",
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{
              background: "rgba(251,191,36,0.15)",
              border: "1px solid rgba(251,191,36,0.3)",
              color: "var(--amber-400)",
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
