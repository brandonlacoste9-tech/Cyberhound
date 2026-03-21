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
  { label: "Québec",     icon: "🍁", tag: "/qc",       color: "var(--red)",          bg: "var(--red-dim)",
    prompt: "Switch to Québec Mode. Identify the top 3 high-MRR opportunities specifically for the Québec / French-Canadian market. Consider bilingual requirements, local regulations, and cultural fit." },
  { label: "Veto",       icon: "🚫", tag: "/veto",     color: "var(--red)",          bg: "var(--red-dim)",
    prompt: "C'est pas chill. Veto the current top opportunity and explain why it's not the right move. Then immediately pivot and identify the next best alternative." },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "queen",
    content: "Queen Bee online. CyberHound v1.0 initialized.\n\nScanning North American markets for high-MRR opportunities. Awaiting your directive — use the commands below or type your own.",
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
      className="card flex flex-col"
      style={{ height: "540px" }}
    >
      {/* ── Header ──────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-3.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "var(--amber-dim)", border: "1px solid rgba(245,158,11,0.25)" }}
          >
            🐝
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
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
                ? { background: "var(--red-dim)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.25)" }
                : { background: "var(--amber-dim)", color: "var(--amber)", border: "1px solid rgba(245,158,11,0.25)" }
            }
          >
            {autonomous ? (
              <><Square className="w-3 h-3" /> Stop</>
            ) : (
              <><Play className="w-3 h-3" /> Auto</>
            )}
          </button>

          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: autonomous ? "var(--amber)" : "var(--green)",
                boxShadow: autonomous ? "0 0 6px var(--amber)" : "0 0 6px var(--green)",
                animation: "pulse-dot 2s ease-in-out infinite",
              }}
            />
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              {autonomous ? "Auto" : "Live"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Command Palette ─────────────────────────── */}
      <div className="shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <button
          onClick={() => setCmdExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-2"
          style={{ background: "var(--bg-muted)" }}
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Commands
          </span>
          {cmdExpanded ? (
            <ChevronUp className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
          ) : (
            <ChevronDown className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
          )}
        </button>

        {cmdExpanded && (
          <div className="px-4 pb-3 pt-2 flex flex-wrap gap-1.5">
            {COMMANDS.map((cmd) => (
              <button
                key={cmd.tag}
                onClick={() => sendMessage(cmd.prompt)}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium"
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
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "queen" && (
              <span className="text-base mr-2 mt-1 shrink-0">🐝</span>
            )}
            <div
              className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
              style={
                msg.role === "queen"
                  ? {
                      background: "var(--bg-muted)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                    }
                  : {
                      background: "var(--amber)",
                      color: "#000",
                      fontWeight: 500,
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
      <div className="px-5 py-4 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
          style={{
            background: "var(--bg-muted)",
            border: "1px solid var(--border-strong)",
            transition: "border-color 0.15s",
          }}
          onFocusCapture={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--amber)";
          }}
          onBlurCapture={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command or directive... (/ for commands)"
            className="flex-1 bg-transparent text-sm outline-none border-none"
            style={{ color: "var(--text-primary)" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
            style={{
              background: input.trim() && !loading ? "var(--amber)" : "var(--border)",
              color: input.trim() && !loading ? "#000" : "var(--text-muted)",
              transition: "background 0.15s",
            }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] mt-1.5 text-center" style={{ color: "var(--text-muted)" }}>
          Tab to autocomplete · Enter to send · OpenClaw → DeepSeek fallback
        </p>
      </div>
    </div>
  );
}
