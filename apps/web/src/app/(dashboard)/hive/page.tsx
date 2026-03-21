"use client";

import { Crown, Search, Hammer, MessageSquare, DollarSign, CheckCircle, XCircle, Clock, Activity } from "lucide-react";

const BEE_ICONS = {
  queen: Crown,
  scout: Search,
  builder: Hammer,
  closer: MessageSquare,
  treasurer: DollarSign,
};

const BEE_COLORS = {
  queen: "var(--amber-400)",
  scout: "var(--status-building)",
  builder: "var(--status-closing)",
  closer: "#a78bfa",
  treasurer: "var(--status-closing)",
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

export default function HivePage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Hive Log
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
          Full audit trail of all bee actions — every decision, every execution
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "queen", "scout", "builder", "closer", "treasurer"] as const).map((filter) => (
          <button
            key={filter}
            className="text-xs px-3 py-1.5 rounded-lg capitalize transition-all"
            style={
              filter === "all"
                ? {
                    background: "rgba(251,191,36,0.15)",
                    border: "1px solid rgba(251,191,36,0.3)",
                    color: "var(--amber-400)",
                  }
                : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-secondary)",
                  }
            }
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Log entries */}
      <div className="space-y-2">
        {MOCK_LOG.map((entry) => {
          const BeeIcon = BEE_ICONS[entry.bee];
          const beeColor = BEE_COLORS[entry.bee];

          const statusConfig = {
            success: { icon: CheckCircle, color: "var(--status-closing)", label: "Success" },
            vetoed: { icon: XCircle, color: "var(--status-vetoed)", label: "Vetoed" },
            pending_approval: { icon: Clock, color: "var(--amber-400)", label: "Pending" },
            error: { icon: XCircle, color: "var(--status-vetoed)", label: "Error" },
          };

          const statusCfg = statusConfig[entry.status] ?? statusConfig.success;

          return (
            <div
              key={entry.id}
              className="glass rounded-xl p-4 flex items-start gap-3"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${beeColor}18`, border: `1px solid ${beeColor}30` }}
              >
                <BeeIcon className="w-4 h-4" style={{ color: beeColor }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold capitalize" style={{ color: beeColor }}>
                    {entry.bee} Bee
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {entry.time}
                  </span>
                </div>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {entry.action}
                </p>
                {entry.details && (
                  <pre
                    className="text-[10px] mt-2 p-2 rounded-md overflow-x-auto"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-geist-mono)",
                    }}
                  >
                    {JSON.stringify(entry.details, null, 2)}
                  </pre>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <statusCfg.icon className="w-3.5 h-3.5" style={{ color: statusCfg.color }} />
                <span className="text-[10px]" style={{ color: statusCfg.color }}>
                  {statusCfg.label}
                </span>
              </div>
            </div>
          );
        })}

        {MOCK_LOG.length === 0 && (
          <div className="glass rounded-xl p-12 text-center">
            <Activity className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No activity logged yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
