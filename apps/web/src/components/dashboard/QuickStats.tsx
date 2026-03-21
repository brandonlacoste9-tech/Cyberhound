"use client";

import { DollarSign, Target, Layers, Bell } from "lucide-react";

const STATS = [
  {
    label: "Total MRR",
    value: "$0",
    delta: "+$0 this week",
    icon: DollarSign,
    accent: "var(--status-green)",
    accentBg: "var(--status-green-bg)",
  },
  {
    label: "Opportunities",
    value: "0",
    delta: "0 pending approval",
    icon: Target,
    accent: "var(--status-amber)",
    accentBg: "var(--status-amber-bg)",
  },
  {
    label: "Active Campaigns",
    value: "0",
    delta: "0 building",
    icon: Layers,
    accent: "var(--status-blue)",
    accentBg: "var(--status-blue-bg)",
  },
  {
    label: "Pending Approvals",
    value: "0",
    delta: "HITL queue clear",
    icon: Bell,
    accent: "var(--status-gray)",
    accentBg: "var(--status-gray-bg)",
  },
];

export function QuickStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STATS.map((stat) => (
        <div key={stat.label} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {stat.label}
            </p>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: stat.accentBg }}
            >
              <stat.icon className="w-4 h-4" style={{ color: stat.accent }} />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {stat.value}
          </p>
          <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
            {stat.delta}
          </p>
        </div>
      ))}
    </div>
  );
}
