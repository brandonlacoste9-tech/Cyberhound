"use client";

const BEES = [
  {
    id: "queen",
    name: "Queen Bee",
    role: "Strategic orchestrator",
    emoji: "👑",
    statusType: "active" as const,
    color: "var(--amber)",
    bg: "var(--amber-dim)",
  },
  {
    id: "scout",
    name: "Scout Bee",
    role: "Market research",
    emoji: "🔍",
    statusType: "idle" as const,
    color: "var(--blue)",
    bg: "var(--blue-dim)",
  },
  {
    id: "builder",
    name: "Builder Bee",
    role: "Landing pages + Stripe",
    emoji: "🏗️",
    statusType: "standby" as const,
    color: "var(--green)",
    bg: "var(--green-dim)",
  },
  {
    id: "closer",
    name: "Closer Bee",
    role: "Cold outreach",
    emoji: "📧",
    statusType: "standby" as const,
    color: "var(--blue)",
    bg: "var(--blue-dim)",
  },
  {
    id: "treasurer",
    name: "Treasurer Bee",
    role: "MRR & revenue",
    emoji: "💰",
    statusType: "active" as const,
    color: "var(--amber)",
    bg: "var(--amber-dim)",
  },
  {
    id: "analyst",
    name: "Analyst Bee",
    role: "Upwork · Churn · Reddit signals",
    emoji: "🔍",
    statusType: "standby" as const,
    color: "var(--blue)",
    bg: "var(--blue-dim)",
  },
  {
    id: "enrich",
    name: "Enrich Bee",
    role: "Apollo.io lead enrichment",
    emoji: "🔬",
    statusType: "standby" as const,
    color: "var(--green)",
    bg: "var(--green-dim)",
  },
  {
    id: "scheduler",
    name: "Scheduler Bee",
    role: "Follow-up sequence automation",
    emoji: "⏰",
    statusType: "active" as const,
    color: "var(--amber)",
    bg: "var(--amber-dim)",
  },
];

const STATUS_CONFIG = {
  active:  { label: "Active",  dot: "var(--green)",        glow: "0 0 6px var(--green)" },
  idle:    { label: "Idle",    dot: "var(--text-muted)",   glow: "none" },
  standby: { label: "Standby", dot: "var(--status-amber)", glow: "0 0 6px var(--amber)" },
};

export function BeeStatusGrid() {
  const activeCount = BEES.filter((b) => b.statusType === "active").length;

  return (
    <div className="card" style={{ padding: "1.25rem" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          🐝 The Hive
        </h3>
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ background: "var(--green-dim)", color: "var(--green)" }}
        >
          {activeCount} Active
        </span>
      </div>

      {/* Bee list */}
      <div className="space-y-2">
        {BEES.map((bee) => {
          const s = STATUS_CONFIG[bee.statusType];
          return (
            <div
              key={bee.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = bee.color;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              }}
            >
              {/* Emoji icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                style={{ background: bee.bg }}
              >
                {bee.emoji}
              </div>

              {/* Name + role */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                  {bee.name}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                  {bee.role}
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: s.dot,
                    boxShadow: s.glow,
                    animation: bee.statusType === "active" ? "pulse-dot 2s ease-in-out infinite" : "none",
                  }}
                />
                <span className="text-[10px] font-medium" style={{ color: s.dot }}>
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
