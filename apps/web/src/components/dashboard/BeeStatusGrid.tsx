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
    <div className="card p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            The Hive
          </h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Agent roster &amp; status
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{ background: "var(--green-dim)", color: "var(--green-bright)", border: "1px solid rgba(16,185,129,0.25)" }}
        >
          {activeCount} active
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {BEES.map((bee) => {
          const s = STATUS_CONFIG[bee.statusType];
          return (
            <div
              key={bee.id}
              className="group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
                transition: "border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "rgba(245,158,11,0.25)";
                el.style.boxShadow = "0 8px 28px rgba(0,0,0,0.25)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "var(--border)";
                el.style.boxShadow = "none";
              }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-base transition-transform group-hover:scale-[1.03]"
                style={{ background: bee.bg, border: "1px solid var(--border-strong)" }}
              >
                {bee.emoji}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {bee.name}
                </p>
                <p className="truncate text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
                  {bee.role}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: s.dot,
                    boxShadow: s.glow,
                    animation: bee.statusType === "active" ? "pulse-dot 2s ease-in-out infinite" : "none",
                  }}
                />
                <span className="text-[10px] font-semibold" style={{ color: s.dot }}>
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
