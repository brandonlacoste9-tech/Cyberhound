"use client";

import { useEffect, useState, useCallback } from "react";
import type { CSSProperties } from "react";
import { useSupabaseBrowser } from "@/lib/supabase/use-supabase-browser";

interface StatsData {
  mrr: number;
  opportunities: number;
  pendingApprovals: number;
  activeCampaigns: number;
}

function formatMrr(cents: number): string {
  if (cents === 0) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function QuickStats() {
  const { client: supabase, mounted } = useSupabaseBrowser();
  const [stats, setStats] = useState<StatsData>({
    mrr: 0,
    opportunities: 0,
    pendingApprovals: 0,
    activeCampaigns: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    // Fetch MRR from treasurer API
    const mrrPromise = fetch("/api/treasurer")
      .then((r) => r.json())
      .then((d) => (typeof d.mrr === "number" ? d.mrr : 0))
      .catch(() => 0);

    // Fetch opportunities + pending approvals from Supabase
    const oppsPromise = supabase
      ? Promise.resolve(
          supabase
            .from("opportunities")
            .select("id, status", { count: "exact" })
        )
          .then(({ data }) => {
            const all = data ?? [];
            return {
              total: all.length,
              pending: all.filter((o: { status: string }) => o.status === "pending_approval").length,
            };
          })
          .catch(() => ({ total: 0, pending: 0 }))
      : Promise.resolve({ total: 0, pending: 0 });

    // Fetch active campaigns from Supabase
    const campaignsPromise = supabase
      ? Promise.resolve(
          supabase
            .from("campaigns")
            .select("id", { count: "exact" })
            .in("status", ["live", "building", "hunting", "closing"])
        )
          .then(({ data }) => (data ?? []).length)
          .catch(() => 0)
      : Promise.resolve(0);

    const [mrr, opps, activeCampaigns] = await Promise.all([
      mrrPromise,
      oppsPromise,
      campaignsPromise,
    ]);

    setStats({
      mrr,
      opportunities: opps.total,
      pendingApprovals: opps.pending,
      activeCampaigns,
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (mounted) fetchStats();
  }, [mounted, fetchStats]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(fetchStats, 60_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const STAT_TILES = [
    {
      label: "Total MRR",
      value: loading ? "—" : formatMrr(stats.mrr),
      delta: stats.mrr > 0 ? "Stripe live" : "No revenue yet",
      emoji: "💰",
      color: "var(--amber)",
      glow: "rgba(245,158,11,0.2)",
      bg: "var(--amber-dim)",
      border: "rgba(245,158,11,0.2)",
    },
    {
      label: "Opportunities",
      value: loading ? "—" : String(stats.opportunities),
      delta: `${stats.pendingApprovals} pending approval`,
      emoji: "🎯",
      color: "var(--blue)",
      glow: "rgba(59,130,246,0.2)",
      bg: "var(--blue-dim)",
      border: "rgba(59,130,246,0.2)",
    },
    {
      label: "Active Campaigns",
      value: loading ? "—" : String(stats.activeCampaigns),
      delta: stats.activeCampaigns > 0 ? "live & building" : "none yet",
      emoji: "🚀",
      color: "var(--green)",
      glow: "rgba(16,185,129,0.2)",
      bg: "var(--green-dim)",
      border: "rgba(16,185,129,0.2)",
    },
    {
      label: "Pending Approvals",
      value: loading ? "—" : String(stats.pendingApprovals),
      delta: stats.pendingApprovals === 0 ? "HITL queue clear" : "needs your review",
      emoji: "🔔",
      color: "var(--status-amber)",
      glow: "rgba(245,158,11,0.15)",
      bg: "var(--amber-dim)",
      border: "rgba(245,158,11,0.15)",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {STAT_TILES.map((stat) => (
        <div
          key={stat.label}
          className="card stat-tile relative overflow-hidden p-4 sm:p-5"
          style={
            {
              "--stat-tile-border": stat.border,
              "--stat-tile-glow": stat.glow,
            } as CSSProperties
          }
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-40 blur-2xl"
            style={{ background: stat.color }}
          />
          <div
            className="relative mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-lg"
            style={{ background: stat.bg, border: `1px solid ${stat.border}` }}
          >
            {stat.emoji}
          </div>

          <p
            className="relative text-2xl font-black leading-none tracking-tight sm:text-3xl"
            style={{ color: stat.color }}
          >
            {stat.value}
          </p>

          <p
            className="relative mt-2 text-[10px] font-bold uppercase tracking-[0.12em] sm:text-[11px]"
            style={{ color: "var(--text-secondary)" }}
          >
            {stat.label}
          </p>

          <p className="relative mt-1 text-[11px] leading-snug sm:text-xs" style={{ color: "var(--text-muted)" }}>
            {stat.delta}
          </p>
        </div>
      ))}
    </div>
  );
}
