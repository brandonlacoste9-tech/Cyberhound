"use client";

import type { CSSProperties } from "react";

const STATS = [
  {
    label: "Total MRR",
    value: "$0",
    delta: "+$0 this week",
    emoji: "💰",
    color: "var(--amber)",
    glow: "rgba(245,158,11,0.2)",
    bg: "var(--amber-dim)",
    border: "rgba(245,158,11,0.2)",
  },
  {
    label: "Opportunities",
    value: "0",
    delta: "0 pending approval",
    emoji: "🎯",
    color: "var(--blue)",
    glow: "rgba(59,130,246,0.2)",
    bg: "var(--blue-dim)",
    border: "rgba(59,130,246,0.2)",
  },
  {
    label: "Active Campaigns",
    value: "0",
    delta: "0 building",
    emoji: "🚀",
    color: "var(--green)",
    glow: "rgba(16,185,129,0.2)",
    bg: "var(--green-dim)",
    border: "rgba(16,185,129,0.2)",
  },
  {
    label: "Pending Approvals",
    value: "0",
    delta: "HITL queue clear",
    emoji: "🔔",
    color: "var(--status-amber)",
    glow: "rgba(245,158,11,0.15)",
    bg: "var(--amber-dim)",
    border: "rgba(245,158,11,0.15)",
  },
];

export function QuickStats() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {STATS.map((stat) => (
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
