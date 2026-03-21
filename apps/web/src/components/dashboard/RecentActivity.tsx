"use client";

import Link from "next/link";

interface ActivityEntry {
  id: string;
  bee: string;
  emoji: string;
  action: string;
  status: "success" | "vetoed" | "pending";
  time: string;
}

const MOCK_ACTIVITY: ActivityEntry[] = [
  {
    id: "1",
    bee: "Queen Bee",
    emoji: "👑",
    action: "CyberHound initialized. Hive online. Awaiting first scout run.",
    status: "success",
    time: "just now",
  },
];

const STATUS_CONFIG = {
  success: { emoji: "✅", color: "var(--green)",        bg: "var(--green-dim)" },
  vetoed:  { emoji: "🚫", color: "var(--red)",          bg: "var(--red-dim)"   },
  pending: { emoji: "⏳", color: "var(--status-amber)", bg: "var(--amber-dim)" },
};

export function RecentActivity() {
  return (
    <div className="card flex flex-col" style={{ minHeight: "200px" }}>
      {/* Header */}
      <div
        className="px-4 py-3.5 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          📋 Hive Log
        </p>
        <Link
          href="/hive"
          className="text-xs font-medium"
          style={{ color: "var(--amber)", transition: "opacity 0.15s" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.7")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
        >
          View all →
        </Link>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {MOCK_ACTIVITY.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-2xl mb-2">🐝</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No activity yet. Type <span style={{ color: "var(--amber)" }}>hunt</span> to begin.
            </p>
          </div>
        ) : (
          MOCK_ACTIVITY.map((entry, i) => {
            const sc = STATUS_CONFIG[entry.status];
            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 px-4 py-3.5"
                style={{
                  borderTop: i > 0 ? "1px solid var(--border)" : "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-muted)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {/* Bee emoji */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5"
                  style={{ background: sc.bg }}
                >
                  {sc.emoji}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                      {entry.bee}
                    </span>
                    <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
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
