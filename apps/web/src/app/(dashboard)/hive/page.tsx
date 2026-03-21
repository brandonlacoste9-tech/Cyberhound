"use client";

import { useState } from "react";
import { Crown, Search, Hammer, MessageSquare, DollarSign, CheckCircle, XCircle, Clock, Activity } from "lucide-react";

const BEE_ICONS = {
  queen:     Crown,
  scout:     Search,
  builder:   Hammer,
  closer:    MessageSquare,
  treasurer: DollarSign,
};

const MOCK_LOG = [
  {
    id: "1",
    bee: "queen" as const,
    action: "CyberHound initialized. Hive online. All bees deployed.",
    status: "success" as const,
    time: "just now",
    details: { version: "1.0.0", bees: 5 },
  },
];

const STATUS_CONFIG = {
  success:          { icon: CheckCircle, color: "var(--status-green)", bg: "var(--status-green-bg)", label: "Success" },
  vetoed:           { icon: XCircle,     color: "var(--status-red)",   bg: "var(--status-red-bg)",   label: "Vetoed"  },
  pending_approval: { icon: Clock,       color: "var(--status-amber)", bg: "var(--status-amber-bg)", label: "Pending" },
  error:            { icon: XCircle,     color: "var(--status-red)",   bg: "var(--status-red-bg)",   label: "Error"   },
};

const FILTERS = ["all", "queen", "scout", "builder", "closer", "treasurer"] as const;

export default function HivePage() {
  const [activeFilter, setActiveFilter] = useState<typeof FILTERS[number]>("all");

  const filtered = MOCK_LOG.filter(
    (e) => activeFilter === "all" || e.bee === activeFilter
  );

  return (
    <div className="p-8 space-y-6">
      {/* ── Header ──────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Hive Log
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
          Full audit trail of all bee actions — every decision, every execution
        </p>
      </div>

      {/* ── Filter bar ──────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className="text-xs px-3 py-1.5 rounded-lg capitalize font-medium"
            style={
              filter === activeFilter
                ? { background: "var(--text-primary)", color: "#ffffff" }
                : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
            }
          >
            {filter}
          </button>
        ))}
      </div>

      {/* ── Log entries ─────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Activity className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-faint)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            No activity logged yet
          </p>
        </div>
      ) : (
        <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
          {filtered.map((entry) => {
            const BeeIcon = BEE_ICONS[entry.bee];
            const sCfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.success;

            return (
              <div key={entry.id} className="flex items-start gap-4 p-5">
                {/* Bee icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "var(--bg-muted)" }}
                >
                  <BeeIcon className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
                      {entry.bee} Bee
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {entry.time}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {entry.action}
                  </p>
                  {entry.details && (
                    <pre
                      className="text-xs mt-3 p-3 rounded-xl overflow-x-auto"
                      style={{
                        background: "var(--bg-muted)",
                        border: "1px solid var(--border)",
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                      }}
                    >
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  )}
                </div>

                {/* Status badge */}
                <span
                  className="badge shrink-0 mt-0.5"
                  style={{ background: sCfg.bg, color: sCfg.color }}
                >
                  <sCfg.icon className="w-3 h-3" />
                  {sCfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
