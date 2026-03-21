"use client";

import Link from "next/link";
import { Crown, CheckCircle, XCircle, Clock } from "lucide-react";

interface ActivityEntry {
  id: string;
  bee: string;
  beeIcon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  action: string;
  status: "success" | "vetoed" | "pending";
  time: string;
}

const MOCK_ACTIVITY: ActivityEntry[] = [
  {
    id: "1",
    bee: "Queen Bee",
    beeIcon: Crown,
    action: "CyberHound initialized. Hive online. Awaiting first scout run.",
    status: "success",
    time: "just now",
  },
];

const STATUS_CONFIG = {
  success: { icon: CheckCircle, color: "var(--status-green)", bg: "var(--status-green-bg)", label: "Done"    },
  vetoed:  { icon: XCircle,     color: "var(--status-red)",   bg: "var(--status-red-bg)",   label: "Vetoed"  },
  pending: { icon: Clock,       color: "var(--status-amber)", bg: "var(--status-amber-bg)", label: "Pending" },
};

export function RecentActivity() {
  return (
    <div className="card h-full flex flex-col">
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Hive Log
        </p>
        <Link
          href="/hive"
          className="text-xs font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          View all →
        </Link>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {MOCK_ACTIVITY.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No activity yet. Start the Hound to begin hunting.
            </p>
          </div>
        ) : (
          MOCK_ACTIVITY.map((entry, i) => {
            const sc = STATUS_CONFIG[entry.status];
            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 px-5 py-4"
                style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
              >
                {/* Status icon */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: sc.bg }}
                >
                  <sc.icon className="w-3.5 h-3.5" style={{ color: sc.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                      {entry.bee}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                      {entry.time}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {entry.action}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
