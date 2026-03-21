"use client";

import { DollarSign, Target, Layers, Bell } from "lucide-react";

const STATS = [
  {
    label: "Total MRR",
    value: "$0",
    delta: "+$0 this week",
    icon: DollarSign,
    color: "var(--status-closing)",
    bg: "rgba(52,211,153,0.1)",
    border: "rgba(52,211,153,0.2)",
  },
  {
    label: "Opportunities",
    value: "0",
    delta: "0 pending approval",
    icon: Target,
    color: "var(--amber-400)",
    bg: "rgba(251,191,36,0.1)",
    border: "rgba(251,191,36,0.2)",
  },
  {
    label: "Active Campaigns",
    value: "0",
    delta: "0 building",
    icon: Layers,
    color: "var(--status-building)",
    bg: "rgba(96,165,250,0.1)",
    border: "rgba(96,165,250,0.2)",
  },
  {
    label: "Pending Approvals",
    value: "0",
    delta: "HITL queue clear",
    icon: Bell,
    color: "var(--status-vetoed)",
    bg: "rgba(248,113,113,0.1)",
    border: "rgba(248,113,113,0.2)",
  },
];

export function QuickStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STATS.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl p-5"
          style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              {stat.label}
            </p>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: stat.bg, border: `1px solid ${stat.border}` }}
            >
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
            </div>
          </div>

          {/* Big number */}
          <p
            className="text-3xl font-black tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {stat.value}
          </p>

          {/* Sub-label */}
          <p
            className="text-xs mt-2 font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {stat.delta}
          </p>
        </div>
      ))}
    </div>
  );
}
