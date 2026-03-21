"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { DollarSign, TrendingUp, Users, RefreshCw, TrendingDown, Zap } from "lucide-react";

interface RevenueData {
  mrr: number;
  arr: number;
  active_subscriptions: number;
  new_this_month: number;
  churned_this_month: number;
  net_revenue_30d: number;
}

// Simulated MRR growth chart data — will populate from real Stripe events
const MRR_CHART_DATA = [
  { date: "Mar 1", mrr: 0, target: 1000 },
  { date: "Mar 7", mrr: 0, target: 2500 },
  { date: "Mar 14", mrr: 0, target: 5000 },
  { date: "Mar 21", mrr: 0, target: 8400 },
  { date: "Mar 28", mrr: 0, target: 10000 },
];

const CHANNEL_DATA = [
  { channel: "Organic", revenue: 0, color: "#10b981" },
  { channel: "Outreach", revenue: 0, color: "#f59e0b" },
  { channel: "Referral", revenue: 0, color: "#3b82f6" },
  { channel: "Ads", revenue: 0, color: "#a78bfa" },
];

function formatCents(cents: number): string {
  if (cents === 0) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
    // Auto-refresh every 60s
    const interval = setInterval(fetchRevenue, 60_000);
    return () => clearInterval(interval);
  }, [fetchRevenue]);

  const mrr = data?.mrr ?? 0;
  const arr = data?.arr ?? 0;
  const subs = data?.active_subscriptions ?? 0;
  const net30d = data?.net_revenue_30d ?? 0;
  const ltv = subs > 0 ? Math.round((mrr / subs) * 12) : 0; // simple LTV = ARPU * 12

  const stats = [
    {
      label: "MRR",
      value: formatCents(mrr),
      sub: `ARR: ${formatCents(arr)}`,
      icon: DollarSign,
      color: "var(--status-closing)",
    },
    {
      label: "Active Subs",
      value: String(subs),
      sub: `+${data?.new_this_month ?? 0} this month`,
      icon: Users,
      color: "var(--status-building)",
    },
    {
      label: "Net Revenue (30d)",
      value: formatCents(net30d),
      sub: "Stripe confirmed",
      icon: TrendingUp,
      color: "var(--amber-400)",
    },
    {
      label: "Est. LTV",
      value: ltv > 0 ? formatCents(ltv * 100) : "$0",
      sub: "ARPU × 12 months",
      icon: Zap,
      color: "#a78bfa",
    },
  ];

  return (
    <div className="p-7 space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
            Revenue
          </h1>
          <p className="text-sm mt-1.5 font-medium" style={{ color: "var(--text-secondary)" }}>
            Treasurer Bee — real-time MRR tracking across all campaigns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Last sync: {lastRefresh.toLocaleTimeString()}
          </p>
          <button
            onClick={fetchRevenue}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "var(--text-secondary)",
            }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-5"
            style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {stat.label}
              </p>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${stat.color}18`, border: `1px solid ${stat.color}30` }}
              >
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
            </div>
            <p className="text-3xl font-black" style={{ color: "var(--text-primary)" }}>
              {loading ? "—" : stat.value}
            </p>
            <p className="text-xs mt-2 font-medium" style={{ color: "var(--text-muted)" }}>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR Growth — 2/3 */}
        <div className="lg:col-span-2 rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              MRR Growth vs Target
            </p>
            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: "#f59e0b" }} />
                Actual
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
                Target
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MRR_CHART_DATA}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgba(255,255,255,0.15)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="rgba(255,255,255,0.15)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [`$${value}`, name === "mrr" ? "MRR" : "Target"]}
              />
              <Area type="monotone" dataKey="target" stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="4 4" fill="url(#targetGrad)" />
              <Area type="monotone" dataKey="mrr" stroke="#f59e0b" strokeWidth={2} fill="url(#mrrGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by channel — 1/3 */}
        <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Revenue by Channel
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CHANNEL_DATA} layout="vertical">
              <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="channel" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`$${value}`, "Revenue"]}
              />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                {CHANNEL_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Churn / health indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <HealthCard
          label="Churn Rate"
          value="0%"
          sub="0 churned this month"
          icon={TrendingDown}
          color="var(--status-closing)"
          good={true}
        />
        <HealthCard
          label="ARPU"
          value={subs > 0 ? formatCents(Math.round(mrr / subs)) : "$0"}
          sub="Average revenue per user"
          icon={DollarSign}
          color="var(--amber-400)"
          good={true}
        />
        <HealthCard
          label="Target to $8.4K MRR"
          value={formatCents(Math.max(0, 840000 - mrr))}
          sub="Ron AI benchmark — 13 days"
          icon={Zap}
          color="var(--status-building)"
          good={mrr >= 840000}
        />
      </div>
    </div>
  );
}

function HealthCard({
  label, value, sub, icon: Icon, color, good,
}: {
  label: string; value: string; sub: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string; good: boolean;
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-black" style={{ color: good ? "var(--status-closing)" : "var(--amber-400)" }}>
        {value}
      </p>
      <p className="text-sm mt-1.5" style={{ color: "var(--text-muted)" }}>{sub}</p>
    </div>
  );
}
