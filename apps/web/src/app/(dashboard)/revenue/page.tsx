"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import { DollarSign, TrendingUp, Users, RefreshCw, TrendingDown, Zap } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

interface RevenueData {
  mrr: number;
  arr: number;
  active_subscriptions: number;
  new_this_month: number;
  churned_this_month: number;
  net_revenue_30d: number;
}

const MRR_CHART_DATA = [
  { date: "Mar 1",  mrr: 0, target: 1000  },
  { date: "Mar 7",  mrr: 0, target: 2500  },
  { date: "Mar 14", mrr: 0, target: 5000  },
  { date: "Mar 21", mrr: 0, target: 8400  },
  { date: "Mar 28", mrr: 0, target: 10000 },
];

const CHANNEL_DATA = [
  { channel: "Organic",  revenue: 0, color: "#10b981" },
  { channel: "Outreach", revenue: 0, color: "#f59e0b" },
  { channel: "Referral", revenue: 0, color: "#3b82f6" },
  { channel: "Ads",      revenue: 0, color: "#8b5cf6" },
];

function formatCents(cents: number): string {
  if (cents === 0) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchRevenue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/treasurer");
      const d = await res.json();
      setData(d);
      setLastRefresh(new Date());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenue();
    const interval = setInterval(fetchRevenue, 60_000);
    return () => clearInterval(interval);
  }, [fetchRevenue]);

  const mrr   = data?.mrr ?? 0;
  const arr   = data?.arr ?? 0;
  const subs  = data?.active_subscriptions ?? 0;
  const net30 = data?.net_revenue_30d ?? 0;
  const ltv   = subs > 0 ? Math.round((mrr / subs) * 12) : 0;

  const stats = [
    { label: "MRR",             value: formatCents(mrr),    sub: `ARR: ${formatCents(arr)}`,                icon: DollarSign, accent: "var(--status-green)", accentBg: "var(--status-green-bg)" },
    { label: "Active Subs",     value: String(subs),        sub: `+${data?.new_this_month ?? 0} this month`, icon: Users,      accent: "var(--status-blue)",  accentBg: "var(--status-blue-bg)"  },
    { label: "Net Revenue 30d", value: formatCents(net30),  sub: "Stripe confirmed",                         icon: TrendingUp, accent: "var(--status-amber)", accentBg: "var(--status-amber-bg)" },
    { label: "Est. LTV",        value: ltv > 0 ? formatCents(ltv * 100) : "$0", sub: "ARPU × 12 months",   icon: Zap,        accent: "var(--status-gray)",  accentBg: "var(--status-gray-bg)"  },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<span aria-hidden>💰</span>}
        title={
          <>
            <span className="text-gradient">Revenue</span>
          </>
        }
        subtitle="Treasurer Bee — MRR, subs, and net revenue from Stripe."
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Synced {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              type="button"
              onClick={fetchRevenue}
              disabled={loading}
              className="btn-ghost gap-2 text-sm font-semibold"
              style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-strong)",
              color: "var(--text-secondary)",
            }}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "spin" : ""}`} />
            Refresh
          </button>
          </div>
        }
      />

      {/* ── Stats grid ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {stat.label}
              </p>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: stat.accentBg }}
              >
                <stat.icon className="w-4 h-4" style={{ color: stat.accent }} />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {loading ? "—" : stat.value}
            </p>
            <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── Charts ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR Growth — 2/3 */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              MRR Growth vs Target
            </p>
            <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: "#2563eb" }} />
                Actual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: "#d1d5db" }} />
                Target
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MRR_CHART_DATA}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#d1d5db" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#d1d5db" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                }}
                formatter={(value: number, name: string) => [`$${value}`, name === "mrr" ? "MRR" : "Target"]}
              />
              <Area type="monotone" dataKey="target" stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#targetGrad)" />
              <Area type="monotone" dataKey="mrr"    stroke="#2563eb" strokeWidth={2}   fill="url(#mrrGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by channel — 1/3 */}
        <div className="card p-5">
          <p className="text-sm font-semibold mb-5" style={{ color: "var(--text-primary)" }}>
            Revenue by Channel
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CHANNEL_DATA} layout="vertical">
              <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="channel" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                }}
                formatter={(value: number) => [`$${value}`, "Revenue"]}
              />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                {CHANNEL_DATA.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Health indicators ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <HealthCard label="Churn Rate"           value="0%"                                                 sub="0 churned this month"       icon={TrendingDown} good={true}           accent="var(--status-green)" accentBg="var(--status-green-bg)" />
        <HealthCard label="ARPU"                  value={subs > 0 ? formatCents(Math.round(mrr / subs)) : "$0"} sub="Average revenue per user"  icon={DollarSign}   good={true}           accent="var(--status-amber)" accentBg="var(--status-amber-bg)" />
        <HealthCard label="Target to $8.4K MRR"  value={formatCents(Math.max(0, 840000 - mrr))}            sub="Ron AI benchmark — 13 days" icon={Zap}          good={mrr >= 840000}  accent="var(--status-blue)"  accentBg="var(--status-blue-bg)"  />
      </div>
    </div>
  );
}

function HealthCard({
  label, value, sub, icon: Icon, good, accent, accentBg,
}: {
  label: string; value: string; sub: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  good: boolean; accent: string; accentBg: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accentBg }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: good ? "var(--status-green)" : "var(--status-amber)" }}>
        {value}
      </p>
      <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>{sub}</p>
    </div>
  );
}
