"use client";

import { Crown, Search, Hammer, MessageSquare, DollarSign } from "lucide-react";

const BEES = [
  {
    id: "queen",
    name: "Queen Bee",
    role: "Strategic Orchestrator",
    detail: "Monitoring market signals",
    icon: Crown,
    statusType: "active" as const,
  },
  {
    id: "scout",
    name: "Scout Bee",
    role: "Market Research",
    detail: "Awaiting directive",
    icon: Search,
    statusType: "idle" as const,
  },
  {
    id: "builder",
    name: "Builder Bee",
    role: "Infrastructure",
    detail: "Ready to deploy",
    icon: Hammer,
    statusType: "standby" as const,
  },
  {
    id: "closer",
    name: "Closer Bee",
    role: "Outreach & Sales",
    detail: "Outreach queue empty",
    icon: MessageSquare,
    statusType: "standby" as const,
  },
  {
    id: "treasurer",
    name: "Treasurer Bee",
    role: "Revenue Tracking",
    detail: "MRR: $0 — watching",
    icon: DollarSign,
    statusType: "active" as const,
  },
];

const STATUS_CONFIG = {
  active:  { label: "Active",  color: "var(--status-green)", bg: "var(--status-green-bg)" },
  idle:    { label: "Idle",    color: "var(--status-gray)",  bg: "var(--status-gray-bg)"  },
  standby: { label: "Standby", color: "var(--status-amber)", bg: "var(--status-amber-bg)" },
};

export function BeeStatusGrid() {
  return (
    <div className="card">
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          The Hive
        </p>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {BEES.length} bees deployed
        </span>
      </div>
      <div>
        {BEES.map((bee, i) => {
          const cfg = STATUS_CONFIG[bee.statusType];
          return (
            <div
              key={bee.id}
              className="flex items-center gap-4 px-5 py-3.5"
              style={{
                borderTop: i > 0 ? "1px solid var(--border)" : "none",
              }}
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--bg-muted)" }}
              >
                <bee.icon className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {bee.name}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                  {bee.detail}
                </p>
              </div>

              {/* Status badge */}
              <span
                className="badge shrink-0"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: cfg.color }}
                />
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
