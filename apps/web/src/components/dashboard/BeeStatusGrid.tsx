"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabaseBrowser } from "@/lib/supabase/use-supabase-browser";

const BEES = [
  { id: "queen",     name: "Queen Bee",       role: "Strategic orchestrator",         emoji: "👑", color: "var(--amber)", bg: "var(--amber-dim)" },
  { id: "scout",     name: "Scout Bee",        role: "Market research",                emoji: "🔍", color: "var(--blue)",  bg: "var(--blue-dim)"  },
  { id: "builder",   name: "Builder Bee",      role: "Landing pages + Stripe",         emoji: "🏗️", color: "var(--green)", bg: "var(--green-dim)" },
  { id: "closer",    name: "Closer Bee",       role: "Cold outreach",                  emoji: "📧", color: "var(--blue)",  bg: "var(--blue-dim)"  },
  { id: "treasurer", name: "Treasurer Bee",    role: "MRR & revenue",                  emoji: "💰", color: "var(--amber)", bg: "var(--amber-dim)" },
  { id: "analyst",   name: "Analyst Bee",      role: "Upwork · Churn · Reddit signals",emoji: "📊", color: "var(--blue)",  bg: "var(--blue-dim)"  },
  { id: "enrich",    name: "Enrich Bee",       role: "Apollo.io lead enrichment",      emoji: "🔬", color: "var(--green)", bg: "var(--green-dim)" },
  { id: "scheduler", name: "Scheduler Bee",   role: "Follow-up sequence automation",  emoji: "⏰", color: "var(--amber)", bg: "var(--amber-dim)" },
] as const;

type BeeId = typeof BEES[number]["id"];

// A bee is "active" if it logged a success/pending event in the last 10 minutes,
// "busy" if it has an event in the last hour, otherwise "idle".
type StatusType = "active" | "busy" | "idle";

const STATUS_CONFIG: Record<StatusType, { label: string; dot: string; glow: string }> = {
  active: { label: "Active",  dot: "var(--green)",        glow: "0 0 6px var(--green)"  },
  busy:   { label: "Busy",    dot: "var(--status-amber)", glow: "0 0 6px var(--amber)"  },
  idle:   { label: "Idle",    dot: "var(--text-muted)",   glow: "none"                  },
};

function deriveStatus(lastSeenMs: number | null): StatusType {
  if (lastSeenMs === null) return "idle";
  const ageMin = (Date.now() - lastSeenMs) / 60000;
  if (ageMin <= 10) return "active";
  if (ageMin <= 60) return "busy";
  return "idle";
}

export function BeeStatusGrid() {
  const { client: supabase, mounted } = useSupabaseBrowser();
  const [lastSeen, setLastSeen] = useState<Record<BeeId, number | null>>(
    Object.fromEntries(BEES.map((b) => [b.id, null])) as Record<BeeId, number | null>
  );

  const fetchStatuses = useCallback(async () => {
    if (!supabase) return;
    // Fetch the most recent log entry per bee in a single query
    const { data } = await supabase
      .from("hive_log")
      .select("bee, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!data) return;

    // Build a map of bee → most recent timestamp
    const seen: Partial<Record<BeeId, number>> = {};
    for (const row of data) {
      const bee = row.bee as BeeId;
      if (!(bee in seen)) {
        seen[bee] = new Date(row.created_at).getTime();
      }
    }

    setLastSeen((prev) => {
      const next = { ...prev };
      for (const bee of BEES.map((b) => b.id)) {
        next[bee] = seen[bee] ?? null;
      }
      return next;
    });
  }, [supabase]);

  useEffect(() => {
    if (!mounted) return;
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 30_000);
    return () => clearInterval(interval);
  }, [mounted, fetchStatuses]);

  // Subscribe to real-time inserts so statuses update instantly
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("bee_status_updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "hive_log" }, () => {
        fetchStatuses();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchStatuses]);

  const beeStatuses = BEES.map((b) => ({
    ...b,
    statusType: deriveStatus(lastSeen[b.id]),
  }));

  const activeCount = beeStatuses.filter((b) => b.statusType === "active").length;
  const busyCount   = beeStatuses.filter((b) => b.statusType === "busy").length;

  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            The Hive
          </h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Agent roster &amp; live status
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "var(--green-dim)", color: "var(--green-bright)", border: "1px solid rgba(16,185,129,0.25)" }}
            >
              {activeCount} active
            </span>
          )}
          {busyCount > 0 && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "var(--amber-dim)", color: "var(--amber-bright)", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              {busyCount} busy
            </span>
          )}
          {activeCount === 0 && busyCount === 0 && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              all idle
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {beeStatuses.map((bee) => {
          const s = STATUS_CONFIG[bee.statusType];
          return (
            <div
              key={bee.id}
              className="group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
                transition: "border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "rgba(245,158,11,0.25)";
                el.style.boxShadow = "0 8px 28px rgba(0,0,0,0.25)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "var(--border)";
                el.style.boxShadow = "none";
              }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-base transition-transform group-hover:scale-[1.03]"
                style={{ background: bee.bg, border: "1px solid var(--border-strong)" }}
              >
                {bee.emoji}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {bee.name}
                </p>
                <p className="truncate text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
                  {bee.role}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: s.dot,
                    boxShadow: s.glow,
                    animation: bee.statusType === "active" ? "pulse-dot 2s ease-in-out infinite" : "none",
                  }}
                />
                <span className="text-[10px] font-semibold" style={{ color: s.dot }}>
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
