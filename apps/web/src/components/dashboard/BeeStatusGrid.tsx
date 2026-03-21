"use client";

import Image from "next/image";
import { Crown, Search, Hammer, MessageSquare, DollarSign } from "lucide-react";

interface Bee {
  id: string;
  name: string;
  role: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  status: "active" | "idle" | "working" | "standby";
  lastAction: string;
  color: string;
}

const BEES: Bee[] = [
  {
    id: "queen",
    name: "Queen Bee",
    role: "Strategic Orchestrator",
    icon: Crown,
    status: "active",
    lastAction: "Monitoring market signals",
    color: "var(--amber-400)",
  },
  {
    id: "scout",
    name: "Scout Bee",
    role: "Market Research",
    icon: Search,
    status: "idle",
    lastAction: "Awaiting directive",
    color: "var(--status-building)",
  },
  {
    id: "builder",
    name: "Builder Bee",
    role: "Infrastructure",
    icon: Hammer,
    status: "standby",
    lastAction: "Ready to deploy",
    color: "var(--status-closing)",
  },
  {
    id: "closer",
    name: "Closer Bee",
    role: "Outreach & Sales",
    icon: MessageSquare,
    status: "standby",
    lastAction: "Outreach queue empty",
    color: "#a78bfa",
  },
  {
    id: "treasurer",
    name: "Treasurer Bee",
    role: "Revenue Tracking",
    icon: DollarSign,
    status: "active",
    lastAction: "MRR: $0 — watching",
    color: "var(--status-closing)",
  },
];

const STATUS_CONFIG: Record<Bee["status"], { color: string; label: string; pulse: boolean }> = {
  active:  { color: "var(--status-closing)",  label: "Active",  pulse: true  },
  working: { color: "var(--status-building)", label: "Working", pulse: true  },
  idle:    { color: "var(--text-muted)",       label: "Idle",    pulse: false },
  standby: { color: "#6b7280",                label: "Standby", pulse: false },
};

export function BeeStatusGrid() {
  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        background: "var(--bg-card)",
        border: "1px solid rgba(255,255,255,0.08)",
        height: "480px",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 border-b shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0"
          style={{ border: "1px solid rgba(251,191,36,0.25)" }}
        >
          <Image src="/cyberhound-mascot.png" alt="Hive" fill className="object-cover" sizes="32px" />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            The Hive
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            5 bees deployed
          </p>
        </div>
      </div>

      {/* Bee list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {BEES.map((bee) => {
          const sc = STATUS_CONFIG[bee.status];
          return (
            <div
              key={bee.id}
              className="flex items-center gap-3 p-3.5 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: `${bee.color}18`,
                  border: `1px solid ${bee.color}30`,
                }}
              >
                <bee.icon className="w-4 h-4" style={{ color: bee.color }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {bee.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {bee.role}
                </p>
                <p className="text-xs mt-1 truncate" style={{ color: "var(--text-muted)" }}>
                  {bee.lastAction}
                </p>
              </div>

              {/* Status badge */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={sc.pulse ? "hound-pulse" : ""}
                  style={{
                    display: "inline-block",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: sc.color,
                  }}
                />
                <span className="text-xs font-medium" style={{ color: sc.color }}>
                  {sc.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
