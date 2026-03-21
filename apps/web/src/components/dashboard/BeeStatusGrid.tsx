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

const STATUS_COLORS: Record<Bee["status"], string> = {
  active: "var(--status-hunting)",
  working: "var(--status-building)",
  idle: "var(--text-muted)",
  standby: "#6b7280",
};

const STATUS_LABELS: Record<Bee["status"], string> = {
  active: "Active",
  working: "Working",
  idle: "Idle",
  standby: "Standby",
};

export function BeeStatusGrid() {
  return (
    <div className="glass rounded-xl overflow-hidden" style={{ height: "480px" }}>
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 border-b"
        style={{ borderColor: "var(--glass-border)" }}
      >
        <div className="relative w-7 h-7 rounded-lg overflow-hidden shrink-0"
          style={{ border: "1px solid rgba(251,191,36,0.2)" }}>
          <Image src="/cyberhound-mascot.png" alt="Hive" fill className="object-cover" sizes="28px" />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            The Hive
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            5 bees deployed
          </p>
        </div>
      </div>

      {/* Bee list */}
      <div className="p-3 space-y-2 overflow-y-auto" style={{ height: "calc(100% - 56px)" }}>
        {BEES.map((bee) => (
          <div
            key={bee.id}
            className="flex items-start gap-3 p-3 rounded-lg transition-all"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {/* Icon */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{
                background: `${bee.color}18`,
                border: `1px solid ${bee.color}30`,
              }}
            >
              <bee.icon className="w-4 h-4" style={{ color: bee.color }} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                  {bee.name}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: STATUS_COLORS[bee.status],
                      ...(bee.status === "active" ? { animation: "hound-pulse 2s ease-in-out infinite" } : {}),
                    }}
                  />
                  <span className="text-[10px]" style={{ color: STATUS_COLORS[bee.status] }}>
                    {STATUS_LABELS[bee.status]}
                  </span>
                </div>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {bee.role}
              </p>
              <p className="text-[10px] mt-1 truncate" style={{ color: "var(--text-secondary)" }}>
                {bee.lastAction}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
