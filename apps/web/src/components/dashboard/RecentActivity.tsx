"use client";

import { Crown, Search, Hammer, MessageSquare, DollarSign, CheckCircle, XCircle, Clock } from "lucide-react";

interface ActivityEntry {
  id: string;
  bee: string;
  beeIcon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  beeColor: string;
  action: string;
  status: "success" | "vetoed" | "pending_approval";
  time: string;
}

const MOCK_ACTIVITY: ActivityEntry[] = [
  {
    id: "1",
    bee: "Queen",
    beeIcon: Crown,
    beeColor: "var(--amber-400)",
    action: "CyberHound initialized. Hive online. Awaiting first scout run.",
    status: "success",
    time: "just now",
  },
];

const STATUS_CONFIG = {
  success: { icon: CheckCircle, color: "var(--status-closing)", label: "Done" },
  vetoed: { icon: XCircle, color: "var(--status-vetoed)", label: "Vetoed" },
  pending_approval: { icon: Clock, color: "var(--amber-400)", label: "Pending" },
};

export function RecentActivity() {
  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--glass-border)" }}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Hive Log
        </p>
        <a
          href="/dashboard/hive"
          className="text-xs transition-opacity hover:opacity-80"
          style={{ color: "var(--amber-400)" }}
        >
          View all →
        </a>
      </div>

      {/* Activity list */}
      <div className="divide-y" style={{ borderColor: "var(--glass-border)" }}>
        {MOCK_ACTIVITY.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No activity yet. Start the Hound to begin hunting.
            </p>
          </div>
        ) : (
          MOCK_ACTIVITY.map((entry) => {
            const statusCfg = STATUS_CONFIG[entry.status];
            return (
              <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                {/* Bee icon */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background: `${entry.beeColor}18`,
                    border: `1px solid ${entry.beeColor}30`,
                  }}
                >
                  <entry.beeIcon className="w-3.5 h-3.5" style={{ color: entry.beeColor }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: entry.beeColor }}>
                      {entry.bee} Bee
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {entry.time}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {entry.action}
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1 shrink-0">
                  <statusCfg.icon className="w-3.5 h-3.5" style={{ color: statusCfg.color }} />
                  <span className="text-[10px]" style={{ color: statusCfg.color }}>
                    {statusCfg.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
