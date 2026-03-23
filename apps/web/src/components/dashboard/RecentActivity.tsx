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
    <div className="card flex min-h-[240px] flex-col xl:sticky xl:top-6">
      <div
        className="flex shrink-0 items-center justify-between px-4 py-4 sm:px-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div>
          <p className="text-sm font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Recent activity
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Latest hive events
          </p>
        </div>
        <Link
          href="/hive"
          className="btn-ghost !py-1.5 text-xs font-semibold"
          style={{ color: "var(--amber-bright)", borderColor: "rgba(245,158,11,0.25)" }}
        >
          View log
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
                className="activity-feed__row flex items-start gap-3 px-4 py-3.5"
                style={{
                  borderTop: i > 0 ? "1px solid var(--border)" : "none",
                }}
              >
                {/* Bee emoji */}
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-sm"
                  style={{ background: sc.bg, border: "1px solid var(--border-strong)" }}
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
