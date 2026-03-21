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
  success:          { icon: CheckCircle, color: "var(--status-closing)", label: "Done"    },
  vetoed:           { icon: XCircle,     color: "var(--status-vetoed)",  label: "Vetoed"  },
  pending_approval: { icon: Clock,       color: "var(--amber-400)",      label: "Pending" },
};

export function RecentActivity() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-card)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Hive Log
        </p>
        <a
          href="/hive"
          className="text-xs font-semibold transition-opacity hover:opacity-70"
          style={{ color: "var(--amber-400)" }}
        >
          View all →
        </a>
      </div>

      {/* Activity list */}
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        {MOCK_ACTIVITY.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No activity yet. Start the Hound to begin hunting.
            </p>
          </div>
        ) : (
          MOCK_ACTIVITY.map((entry) => {
            const sc = STATUS_CONFIG[entry.status];
            return (
              <div key={entry.id} className="flex items-center gap-4 px-5 py-4">
                {/* Bee icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: `${entry.beeColor}18`,
                    border: `1px solid ${entry.beeColor}28`,
                  }}
                >
                  <entry.beeIcon className="w-4 h-4" style={{ color: entry.beeColor }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold" style={{ color: entry.beeColor }}>
                      {entry.bee} Bee
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {entry.time}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {entry.action}
                  </p>
                </div>

                {/* Status badge */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0"
                  style={{
                    background: `${sc.color}12`,
                    border: `1px solid ${sc.color}25`,
                  }}
                >
                  <sc.icon className="w-3.5 h-3.5" style={{ color: sc.color }} />
                  <span className="text-xs font-semibold" style={{ color: sc.color }}>
                    {sc.label}
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
