"use client";

import { useState } from "react";
import { Search, Target, TrendingUp, AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface Opportunity {
  id: string;
  niche: string;
  market: string;
  score: number;
  demand_signals: string[];
  competition_level: "low" | "medium" | "high";
  estimated_mrr_potential: string;
  recommended_price_point: string;
  queen_reasoning: string;
  status: "discovered" | "pending_approval" | "approved" | "rejected";
}

const COMPETITION_COLORS = {
  low: "var(--status-closing)",
  medium: "var(--amber-400)",
  high: "var(--status-vetoed)",
};

export default function OpportunitiesPage() {
  const [niche, setNiche] = useState("");
  const [market, setMarket] = useState("North America");
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleScout() {
    if (!niche.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: niche.trim(), market }),
      });

      const data = await res.json();
      if (data.opportunity) {
        const opp: Opportunity = {
          id: Date.now().toString(),
          ...data.opportunity,
          status: "pending_approval",
        };
        setOpportunities((prev) => [opp, ...prev]);
        setNiche("");
      } else {
        setError(data.error ?? "Scout failed");
      }
    } catch {
      setError("Network error — check API configuration");
    } finally {
      setLoading(false);
    }
  }

  function handleApprove(id: string) {
    setOpportunities((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "approved" } : o))
    );
  }

  function handleReject(id: string) {
    setOpportunities((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "rejected" } : o))
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Opportunities
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
          Scout Bee market research — identify and approve high-MRR niches
        </p>
      </div>

      {/* Scout input */}
      <div className="glass rounded-xl p-5">
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          🔍 Deploy Scout Bee
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScout()}
            placeholder="e.g. AI scheduling for dental clinics, permit tracking SaaS..."
            className="flex-1 bg-transparent text-sm outline-none px-3 py-2 rounded-lg"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          />
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            <option value="North America">North America</option>
            <option value="Canada">Canada</option>
            <option value="USA">USA</option>
            <option value="Québec">Québec</option>
          </select>
          <button
            onClick={handleScout}
            disabled={!niche.trim() || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
            style={{
              background: "rgba(251,191,36,0.15)",
              border: "1px solid rgba(251,191,36,0.3)",
              color: "var(--amber-400)",
            }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {loading ? "Scouting..." : "Scout"}
          </button>
        </div>
        {error && (
          <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: "var(--status-vetoed)" }}>
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
      </div>

      {/* Opportunities list */}
      {opportunities.length === 0 ? (
        <div
          className="glass rounded-xl p-12 text-center"
        >
          <Target className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            No opportunities scouted yet
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Enter a niche above and deploy Scout Bee to analyze market potential
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              onApprove={() => handleApprove(opp.id)}
              onReject={() => handleReject(opp.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OpportunityCard({
  opportunity: opp,
  onApprove,
  onReject,
}: {
  opportunity: Opportunity;
  onApprove: () => void;
  onReject: () => void;
}) {
  const scoreColor =
    opp.score >= 75
      ? "var(--status-closing)"
      : opp.score >= 50
      ? "var(--amber-400)"
      : "var(--status-vetoed)";

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              {opp.niche}
            </h3>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: `${COMPETITION_COLORS[opp.competition_level]}18`,
                border: `1px solid ${COMPETITION_COLORS[opp.competition_level]}30`,
                color: COMPETITION_COLORS[opp.competition_level],
              }}
            >
              {opp.competition_level} competition
            </span>
            <StatusBadge status={opp.status} />
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {opp.market}
          </p>
        </div>

        {/* Score */}
        <div className="text-right shrink-0">
          <p className="text-3xl font-black" style={{ color: scoreColor }}>
            {opp.score}
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            score
          </p>
        </div>
      </div>

      {/* Revenue metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-lg p-3"
          style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}
        >
          <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
            MRR Potential
          </p>
          <p className="text-sm font-bold mt-0.5" style={{ color: "var(--status-closing)" }}>
            {opp.estimated_mrr_potential}
          </p>
        </div>
        <div
          className="rounded-lg p-3"
          style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}
        >
          <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
            Price Point
          </p>
          <p className="text-sm font-bold mt-0.5" style={{ color: "var(--amber-400)" }}>
            {opp.recommended_price_point}
          </p>
        </div>
      </div>

      {/* Demand signals */}
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
          Demand Signals
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(opp.demand_signals ?? []).map((signal, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-1 rounded-md"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--text-secondary)",
              }}
            >
              {signal}
            </span>
          ))}
        </div>
      </div>

      {/* Queen reasoning */}
      <div
        className="rounded-lg p-3"
        style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.1)" }}
      >
        <p className="text-[10px] font-medium mb-1" style={{ color: "var(--amber-400)" }}>
          👑 Queen Bee Assessment
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {opp.queen_reasoning}
        </p>
      </div>

      {/* HITL Actions */}
      {opp.status === "pending_approval" && (
        <div className="flex items-center gap-3 pt-1">
          <p className="text-xs flex-1" style={{ color: "var(--text-muted)" }}>
            ⚠️ HITL required — approve to proceed with Builder Bee
          </p>
          <button
            onClick={onReject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "var(--status-vetoed)",
            }}
          >
            <XCircle className="w-3.5 h-3.5" />
            C&apos;est pas chill
          </button>
          <button
            onClick={onApprove}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.25)",
              color: "var(--status-closing)",
            }}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Approve
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Opportunity["status"] }) {
  const config = {
    discovered: { label: "Discovered", color: "var(--text-muted)" },
    pending_approval: { label: "⚠️ Pending Approval", color: "var(--amber-400)" },
    approved: { label: "✅ Approved", color: "var(--status-closing)" },
    rejected: { label: "🚫 Vetoed", color: "var(--status-vetoed)" },
  };
  const cfg = config[status];
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full"
      style={{
        background: `${cfg.color}15`,
        border: `1px solid ${cfg.color}30`,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  );
}
