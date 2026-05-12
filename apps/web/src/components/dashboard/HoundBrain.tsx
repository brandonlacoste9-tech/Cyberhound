"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Play, Square, ChevronDown, ChevronUp } from "lucide-react";
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

interface Command {
  label: string;
  icon: string;
  tag: string;
  prompt: string;
  color: string;
  bg: string;
}

const COMMANDS: Command[] = [
  { label: "Hunt",       icon: "🎯", tag: "/hunt",     color: "var(--amber)",        bg: "var(--amber-dim)",
    prompt: "hunt" },
  { label: "Scout",      icon: "🔍", tag: "/scout",    color: "var(--blue)",         bg: "var(--blue-dim)",
    prompt: "Run Scout Bee on the top opportunity. Find real demand signals, competitors, and pricing data for the highest-MRR niche you can identify right now." },
  { label: "Build",      icon: "🏗️", tag: "/build",    color: "var(--green)",        bg: "var(--green-dim)",
    prompt: "Activate Builder Bee. Generate a landing page concept and Stripe product for our top approved opportunity. Include headline, subheadline, 3 key features, pricing, and CTA." },
  { label: "Close",      icon: "📧", tag: "/close",    color: "var(--red)",          bg: "var(--red-dim)",
    prompt: "Activate Closer Bee. Write a 3-email cold outreach sequence for our top opportunity. Email 1: problem-aware cold open. Email 2: social proof + ROI. Email 3: urgency close." },
  { label: "Revenue",    icon: "💰", tag: "/revenue",  color: "var(--green)",        bg: "var(--green-dim)",
    prompt: "Give me a full revenue breakdown. What's our current MRR trajectory? What's the fastest path to $10K MRR from where we are now? Be specific with actions and timelines." },
  { label: "Status",     icon: "📊", tag: "/status",   color: "var(--blue)",         bg: "var(--blue-dim)",
    prompt: "Give me a full hive status report. Which bees are active, what opportunities are in the pipeline, what's pending my approval, and what's the next highest-leverage action I should take?" },
  { label: "Validate",   icon: "✅", tag: "/validate", color: "var(--amber)",        bg: "var(--amber-dim)",
    prompt: "Validate our top opportunity. Score it 0–100 on: market size, competition, willingness to pay, speed to revenue, and Brandon's unfair advantage. Give a final go/no-go verdict." },
  { label: "30-Day Plan",icon: "📅", tag: "/plan",     color: "var(--blue)",         bg: "var(--blue-dim)",
    prompt: "Generate a 30-day execution plan to launch a SaaS and hit $5K MRR. Week-by-week breakdown: build, launch, outreach, and iterate. Be specific and actionable." },
  { label: "Neural",     icon: "🧠", tag: "/neural",    color: "var(--amber)",        bg: "var(--amber-dim)",
    prompt: "Activate Neural Workforce. Scan all signal modes (Upwork, Churn, Reddit) for the highest-urgency B2B leads right now. Ignore low-budget projects and focus on enterprise pain points." },
  { label: "Veto",       icon: "🚫", tag: "/veto",     color: "var(--red)",          bg: "var(--red-dim)",
    prompt: "C'est pas chill. Veto the current top opportunity and explain why it's not the right move. Then immediately pivot and identify the next best alternative." },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "queen",
    content: "Queen Bee online. CyberHound Neural Workforce initialized.\n\nMonitoring North American B2B signal streams. Awaiting your directive.",
    timestamp: new Date(),
  },
];

export function HoundBrain() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [history, setHistory] = useState<HistoryMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autonomous, setAutonomous] = useState(false);
  const [cmdExpanded, setCmdExpanded] = useState(true);
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

    const newHistory: HistoryMessage[] = [
      ...history,
      { role: "user", content: text.trim() },
    ];

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
          content: "⚠️ Connection error. Check API configuration in Settings.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") sendMessage(input);
    if (e.key === "Tab" && input.startsWith("/")) {
      e.preventDefault();
      const match = COMMANDS.find((c) => c.tag.startsWith(input));
      if (match) setInput(match.tag);
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
      className="card card-amber hound-brain-shell flex min-h-[min(560px,72vh)] flex-col"
    >
      {/* ── Header ──────────────────────────────────── */}
      <div
        className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-xl shadow-sm"
            style={{
              background: "linear-gradient(145deg, rgba(245,158,11,0.2), rgba(245,158,11,0.06))",
              border: "1px solid rgba(245,158,11,0.3)",
              boxShadow: "0 0 24px rgba(245,158,11,0.12)",
            }}
          >
            🐝
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Queen Bee
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Strategic orchestrator
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleAutonomous}
            className={cn(
              "flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2 text-xs font-semibold transition-colors",
            )}
            style={
              autonomous
                ? { background: "var(--red-dim)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.28)" }
                : { background: "var(--amber-dim)", color: "var(--amber-bright)", border: "1px solid rgba(245,158,11,0.28)" }
            }
          >
            {autonomous ? (
              <>
                <Square className="h-3.5 w-3.5" /> Stop auto
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Auto run
              </>
            )}
          </button>

          <div
            className="flex items-center gap-2 rounded-full px-2.5 py-1"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: autonomous ? "var(--amber)" : "var(--green)",
                boxShadow: autonomous ? "0 0 8px var(--amber)" : "0 0 8px var(--green)",
                animation: "pulse-dot 2s ease-in-out infinite",
              }}
            />
            <span className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
              {autonomous ? "Autonomous" : "Live"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Command Palette ─────────────────────────── */}
      <div className="shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <button
          type="button"
          onClick={() => setCmdExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-2.5 transition-colors hover:bg-white/[0.03]"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ color: "var(--text-muted)" }}
          >
            Quick commands
          </span>
          {cmdExpanded ? (
            <ChevronUp className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
          ) : (
            <ChevronDown className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
          )}
        </button>

        {cmdExpanded && (
          <div className="flex flex-wrap gap-2 px-4 pb-4 pt-2">
            {COMMANDS.map((cmd) => (
              <button
                type="button"
                key={cmd.tag}
                onClick={() => sendMessage(cmd.prompt)}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-2 text-xs font-medium"
                style={{
                  background: cmd.bg,
                  border: `1px solid ${cmd.color}22`,
                  color: cmd.color,
                  opacity: loading ? 0.5 : 1,
                  transition: "opacity 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = cmd.color;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${cmd.color}22`;
                }}
                title={cmd.tag}
              >
                <span>{cmd.icon}</span>
                <span>{cmd.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Messages ────────────────────────────────── */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "queen" && (
              <span className="mr-2 mt-1.5 shrink-0 text-base" aria-hidden>
                🐝
              </span>
            )}
            <div
              className="max-w-[min(92%,520px)] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed"
              style={
                msg.role === "queen"
                  ? {
                      background: "linear-gradient(165deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-strong)",
                      boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                    }
                  : {
                      background: "linear-gradient(135deg, var(--amber-bright) 0%, var(--amber) 100%)",
                      color: "#0a0a0a",
                      fontWeight: 600,
                      border: "1px solid rgba(0,0,0,0.08)",
                      boxShadow: "0 6px 20px rgba(245,158,11,0.25)",
                    }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start items-center gap-2">
            <span className="text-base">🐝</span>
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm"
              style={{
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              <Loader2 className="w-3.5 h-3.5 spin" />
              <span>Queen Bee thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ───────────────────────────────────── */}
      <div className="shrink-0 px-5 pb-5 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-2.5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-strong)",
            transition: "border-color 0.15s, box-shadow 0.2s",
          }}
          onFocusCapture={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "rgba(245,158,11,0.45)";
            el.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.12)";
          }}
          onBlurCapture={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "var(--border-strong)";
            el.style.boxShadow = "none";
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Directive for Queen Bee… (Tab completes /commands)"
            className="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-[var(--text-faint)]"
            style={{ color: "var(--text-primary)" }}
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-all"
            style={{
              background: input.trim() && !loading ? "linear-gradient(135deg, var(--amber-bright), var(--amber))" : "var(--bg-muted)",
              color: input.trim() && !loading ? "#0a0a0a" : "var(--text-muted)",
              border: input.trim() && !loading ? "none" : "1px solid var(--border)",
              boxShadow: input.trim() && !loading ? "0 2px 12px rgba(245,158,11,0.35)" : "none",
            }}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px]" style={{ color: "var(--text-faint)" }}>
          Tab completes · Enter sends · Queen → API route
        </p>
      </div>
    </div>
  );
}
