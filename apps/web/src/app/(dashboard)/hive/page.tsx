"use client";

import { useState, useEffect, useCallback } from "react";
import { Crown, Search, Hammer, MessageSquare, DollarSign, CheckCircle, XCircle, Clock, Activity, RefreshCw } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BEE_ICONS = {
  queen:     Crown,
  scout:     Search,
  builder:   Hammer,
  closer:    MessageSquare,
  treasurer: DollarSign,
};

const STATUS_CONFIG = {
  success:          { icon: CheckCircle, color: "var(--status-green)", bg: "var(--status-green-bg)", label: "Success" },
  vetoed:           { icon: XCircle,     color: "var(--status-red)",   bg: "var(--status-red-bg)",   label: "Vetoed"  },
  pending_approval: { icon: Clock,       color: "var(--status-amber)", bg: "var(--status-amber-bg)", label: "Pending" },
  error:            { icon: XCircle,     color: "var(--status-red)",   bg: "var(--status-red-bg)",   label: "Error"   },
};

const FILTERS = ["all", "queen", "scout", "builder", "closer", "treasurer"] as const;

interface LogEntry {
  id: string;
  created_at: string;
  bee: keyof typeof BEE_ICONS;
  action: string;
  details: Record<string, unknown>;
  status: keyof typeof STATUS_CONFIG;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function HivePage() {
  const [activeFilter, setActiveFilter] = useState<typeof FILTERS[number]>("all");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLog = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("hive_log")
        .select("id, created_at, bee, action, details, status")
        .order("created_at", { ascending: false })
        .limit(100);

      if (activeFilter !== "all") {
        query = query.eq("bee", activeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLog((data ?? []) as LogEntry[]);
    } catch (err) {
      console.error("[HiveLog]", err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchLog();

    // Real-time subscription
    const channel = supabase
      .channel("hive_log_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "hive_log" }, () => {
        fetchLog();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLog]);

  return (
    <div className="p-8 space-y-6">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Hive Log
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Full audit trail of all bee actions — every decision, every execution
          </p>
        </div>
        <button
          onClick={fetchLog}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-secondary)",
          }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "spin" : ""}`} />
          Refresh
        </button>
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
      {loading ? (
        <div className="card p-16 text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 spin" style={{ color: "var(--text-faint)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading hive log...</p>
        </div>
      ) : log.length === 0 ? (
        <div className="card p-16 text-center">
          <Activity className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-faint)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            No activity logged yet
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Start a Scout run or send a directive to the Queen Bee
          </p>
        </div>
      ) : (
        <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
          {log.map((entry) => {
            const BeeIcon = BEE_ICONS[entry.bee] ?? Crown;
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
                      {timeAgo(entry.created_at)}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {entry.action}
                  </p>
                  {entry.details && Object.keys(entry.details).length > 0 && (
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
