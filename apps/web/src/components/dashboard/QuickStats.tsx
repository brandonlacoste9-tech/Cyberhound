"use client";

import { DollarSign, Target, Layers, Bell } from "lucide-react";

const STATS = [
  {
    label: "Total MRR",
    value: "$0",
    delta: "+$0 this week",
    icon: DollarSign,
    color: "var(--status-closing)",
  },
  {
    label: "Opportunities",
    value: "0",
    delta: "0 pending approval",
    icon: Target,
    color: "var(--status-hunting)",
  },
  {
    label: "Active Campaigns",
    value: "0",
    delta: "0 building",
    icon: Layers,
    color: "var(--status-building)",
  },
  {
    label: "Pending Approvals",
    value: "0",
    delta: "HITL queue clear",
    icon: Bell,
    color: "var(--amber-400)",
  },
];

export function QuickStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STATS.map((stat) => (
        <div
          key={stat.label}
          className="glass rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              {stat.label}
            </p>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `${stat.color}18`, border: `1px solid ${stat.color}30` }}
            >
              <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
            </div>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {stat.value}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {stat.delta}
          </p>
        </div>
      ))}
    </div>
  );
}
