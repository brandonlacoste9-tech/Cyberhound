"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSupabaseBrowser } from "@/lib/supabase/use-supabase-browser";

interface ActivityEntry {
  id: string;
  bee: string;
  action: string;
  status: "success" | "vetoed" | "pending_approval" | "error";
  created_at: string;
}

const STATUS_CONFIG = {
  success:          { emoji: "✅", color: "var(--green)",        bg: "var(--green-dim)"  },
  vetoed:           { emoji: "🚫", color: "var(--red)",          bg: "var(--red-dim)"    },
  pending_approval: { emoji: "⏳", color: "var(--status-amber)", bg: "var(--amber-dim)"  },
  error:            { emoji: "❌", color: "var(--red)",          bg: "var(--red-dim)"    },
};

const BEE_EMOJI: Record<string, string> = {
  queen:     "👑",
  scout:     "🔍",
  builder:   "🏗️",
  closer:    "📧",
  closer_v2: "📧",
  treasurer: "💰",
  analyst:   "📊",
  enrich:    "🔬",
  scheduler: "⏰",
  wasp:      "⚡",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function RecentActivity() {
  const { client: supabase, mounted } = useSupabaseBrowser();
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("hive_log")
      .select("id, bee, action, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    setActivity((data ?? []) as ActivityEntry[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      if (mounted) setLoading(false);
      return;
    }
    fetchActivity();

    const channel = supabase
      .channel("recent_activity_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "hive_log" }, () => {
        fetchActivity();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, mounted, fetchActivity]);

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
        {loading ? (
          <div className="px-4 py-10 text-center">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Loading…</p>
          </div>
        ) : activity.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-2xl mb-2">🐝</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No activity yet. Type <span style={{ color: "var(--amber)" }}>hunt</span> to begin.
            </p>
          </div>
        ) : (
          activity.map((entry, i) => {
            const sc = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.success;
            const beeEmoji = BEE_EMOJI[entry.bee] ?? "🐝";
            return (
              <div
                key={entry.id}
                className="activity-feed__row flex items-start gap-3 px-4 py-3.5"
                style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
              >
                {/* Status badge */}
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-sm"
                  style={{ background: sc.bg, border: "1px solid var(--border-strong)" }}
                >
                  {sc.emoji}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
                      {beeEmoji} {entry.bee} Bee
                    </span>
                    <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
                      {timeAgo(entry.created_at)}
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
