"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Play, Square } from "lucide-react";
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
      "Queen Bee online. CyberHound v1.0 initialized. Scanning North American markets for high-MRR opportunities.\n\nAwaiting your directive — or type \"hunt\" to begin autonomous scouting.",
    timestamp: new Date(),
  },
];

const QUICK_COMMANDS = [
  { label: "Hunt opportunities",  prompt: "Scout North American markets for 3 high-MRR SaaS opportunities. Rank by score and give me your top pick." },
  { label: "Revenue strategy",    prompt: "What's the fastest path to $10K MRR? Be specific." },
  { label: "Validate niche",      prompt: "Validate: AI-powered permit tracking for Canadian general contractors. Score it and give me a go/no-go." },
  { label: "30-day build plan",   prompt: "Give me a 30-day execution plan to launch a SaaS in the trades space and hit $5K MRR." },
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
          content: "Connection error. Check API configuration in Settings.",
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
          content: "Autonomous mode paused. Awaiting your directive.",
          timestamp: new Date(),
        },
      ]);
    }
  }

  return (
    <div
      className="card flex flex-col"
      style={{ height: "460px" }}
    >
      {/* ── Header ──────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
            style={{ background: "var(--status-amber-bg)" }}
          >
            🐝
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Queen Bee
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Strategic orchestrator
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleAutonomous}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={
              autonomous
                ? { background: "var(--status-red-bg)", color: "var(--status-red)" }
                : { background: "var(--status-amber-bg)", color: "var(--status-amber)" }
            }
          >
            {autonomous ? <><Square className="w-3 h-3" /> Stop</> : <><Play className="w-3 h-3" /> Auto</>}
          </button>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full pulse"
              style={{ background: autonomous ? "var(--status-amber)" : "var(--status-green)" }}
            />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {autonomous ? "Hunting" : "Live"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Messages ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
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
                      background: "var(--bg-muted)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                    }
                  : {
                      background: "var(--text-primary)",
                      color: "#ffffff",
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
              className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm"
              style={{
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              <Loader2 className="w-4 h-4 spin" />
              Thinking...
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
              className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {cmd.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Input ───────────────────────────────────── */}
      <div
        className="px-5 py-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
          style={{ background: "var(--bg-muted)", border: "1px solid var(--border-strong)" }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Direct the Queen Bee..."
            className="flex-1 bg-transparent text-sm outline-none border-none"
            style={{ color: "var(--text-primary)", padding: 0 }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
            style={{
              background: input.trim() ? "var(--text-primary)" : "var(--border)",
              color: input.trim() ? "#fff" : "var(--text-muted)",
            }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
