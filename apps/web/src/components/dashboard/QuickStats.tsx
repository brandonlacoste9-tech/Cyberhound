"use client";

const STATS = [
  {
    label: "Total MRR",
    value: "$0",
    delta: "+$0 this week",
    emoji: "💰",
    color: "var(--amber)",
    glow: "rgba(245,158,11,0.2)",
    bg: "var(--amber-dim)",
    border: "rgba(245,158,11,0.2)",
  },
  {
    label: "Opportunities",
    value: "0",
    delta: "0 pending approval",
    emoji: "🎯",
    color: "var(--blue)",
    glow: "rgba(59,130,246,0.2)",
    bg: "var(--blue-dim)",
    border: "rgba(59,130,246,0.2)",
  },
  {
    label: "Active Campaigns",
    value: "0",
    delta: "0 building",
    emoji: "🚀",
    color: "var(--green)",
    glow: "rgba(16,185,129,0.2)",
    bg: "var(--green-dim)",
    border: "rgba(16,185,129,0.2)",
  },
  {
    label: "Pending Approvals",
    value: "0",
    delta: "HITL queue clear",
    emoji: "🔔",
    color: "var(--status-amber)",
    glow: "rgba(245,158,11,0.15)",
    bg: "var(--amber-dim)",
    border: "rgba(245,158,11,0.15)",
  },
];

export function QuickStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STATS.map((stat) => (
        <div
          key={stat.label}
          className="card"
          style={{ padding: "1.25rem" }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = stat.border;
            el.style.boxShadow = `0 4px 32px rgba(0,0,0,0.5), 0 0 20px ${stat.glow}`;
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "var(--border)";
            el.style.boxShadow = "var(--shadow-card)";
          }}
        >
          {/* Icon badge */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base mb-3"
            style={{ background: stat.bg }}
          >
            {stat.emoji}
          </div>

          {/* Value */}
          <p
            className="text-2xl font-black tracking-tight leading-none"
            style={{ color: stat.color }}
          >
            {stat.value}
          </p>

          {/* Label */}
          <p
            className="text-xs font-semibold uppercase tracking-wider mt-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            {stat.label}
          </p>

          {/* Delta */}
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {stat.delta}
          </p>
        </div>
      ))}
    </div>
  );
}
