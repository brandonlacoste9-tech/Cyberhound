"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Target, AlertCircle, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Opportunity {
  id: string;
  created_at: string;
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

const COMPETITION_COLORS = { low: "var(--status-green)", medium: "var(--status-amber)", high: "var(--status-red)" };
const COMPETITION_BG     = { low: "var(--status-green-bg)", medium: "var(--status-amber-bg)", high: "var(--status-red-bg)" };

export default function OpportunitiesPage() {
  const [niche, setNiche]           = useState("");
  const [market, setMarket]         = useState("North America");
  const [loading, setLoading]       = useState(false);
  const [fetching, setFetching]     = useState(true);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [error, setError]           = useState<string | null>(null);

  const fetchOpportunities = useCallback(async () => {
    setFetching(true);
    try {
      const { data, error: dbErr } = await supabase
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (dbErr) throw dbErr;
      setOpportunities((data ?? []) as Opportunity[]);
    } catch (err) {
      console.error("[Opportunities fetch]", err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
    const channel = supabase
      .channel("opportunities_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, fetchOpportunities)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOpportunities]);

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
        setNiche("");
        await fetchOpportunities(); // refresh from DB
      } else {
        setError(data.error ?? "Scout failed");
      }
    } catch {
      setError("Network error — check API configuration");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    await supabase.from("opportunities").update({ status: "approved" }).eq("id", id);
    await supabase.from("hive_log").insert({
      bee: "queen",
      action: `Opportunity approved by Brandon`,
      details: { opportunity_id: id },
      status: "success",
    });
    fetchOpportunities();
  }

  async function handleReject(id: string) {
    await supabase.from("opportunities").update({ status: "rejected" }).eq("id", id);
    await supabase.from("hive_log").insert({
      bee: "queen",
      action: `Opportunity vetoed — C'est pas chill`,
      details: { opportunity_id: id },
      status: "vetoed",
    });
    fetchOpportunities();
  }

  return (
    <div className="p-8 space-y-6">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🔍</span>
            <h1 className="text-2xl font-black text-gradient">Opportunities</h1>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Scout Bee market research — identify and approve high-MRR niches
          </p>
        </div>
        <button
          onClick={fetchOpportunities}
          disabled={fetching}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-secondary)",
          }}
        >
          <RefreshCw className={`w-4 h-4 ${fetching ? "spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Scout input ─────────────────────────────── */}
      <div className="card card-amber p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🐝</span>
          <p className="text-sm font-bold" style={{ color: "var(--amber)" }}>Deploy Scout Bee</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScout()}
            placeholder="e.g. AI scheduling for dental clinics, permit tracking SaaS..."
            style={{ flex: 1, minWidth: "240px" }}
          />
          <select value={market} onChange={(e) => setMarket(e.target.value)}>
            <option value="North America">North America</option>
            <option value="Canada">Canada</option>
            <option value="USA">USA</option>
            <option value="Québec">Québec</option>
          </select>
          <button
            onClick={handleScout}
            disabled={!niche.trim() || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--amber)", color: "#000", fontWeight: 700 }}
          >
            {loading ? <Loader2 className="w-4 h-4 spin" /> : <Search className="w-4 h-4" />}
            {loading ? "Scouting..." : "Scout"}
          </button>
        </div>
        {error && (
          <p className="text-sm mt-3 flex items-center gap-2" style={{ color: "var(--status-red)" }}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </p>
        )}
      </div>

      {/* ── Opportunities list ──────────────────────── */}
      {fetching && opportunities.length === 0 ? (
        <div className="card p-16 text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 spin" style={{ color: "var(--text-faint)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading opportunities...</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="card p-16 text-center">
          <Target className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-faint)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            No opportunities scouted yet
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
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
  const scoreColor   = opp.score >= 75 ? "var(--status-green)" : opp.score >= 50 ? "var(--status-amber)" : "var(--status-red)";
  const scoreColorBg = opp.score >= 75 ? "var(--status-green-bg)" : opp.score >= 50 ? "var(--status-amber-bg)" : "var(--status-red-bg)";

  const statusConfig = {
    discovered:       { label: "Discovered",      color: "var(--status-gray)",  bg: "var(--status-gray-bg)"  },
    pending_approval: { label: "Pending Approval", color: "var(--status-amber)", bg: "var(--status-amber-bg)" },
    approved:         { label: "Approved",         color: "var(--status-green)", bg: "var(--status-green-bg)" },
    rejected:         { label: "Vetoed",           color: "var(--status-red)",   bg: "var(--status-red-bg)"   },
  };
  const sCfg = statusConfig[opp.status] ?? statusConfig.discovered;

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{opp.niche}</h3>
            <span className="badge" style={{ background: COMPETITION_BG[opp.competition_level], color: COMPETITION_COLORS[opp.competition_level] }}>
              {opp.competition_level} competition
            </span>
            <span className="badge" style={{ background: sCfg.bg, color: sCfg.color }}>{sCfg.label}</span>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{opp.market}</p>
        </div>
        <div className="text-center px-4 py-3 rounded-xl shrink-0" style={{ background: scoreColorBg }}>
          <p className="text-3xl font-bold" style={{ color: scoreColor }}>{opp.score}</p>
          <p className="text-xs font-medium" style={{ color: scoreColor }}>/ 100</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: "var(--status-green-bg)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>MRR Potential</p>
          <p className="text-sm font-bold" style={{ color: "var(--status-green)" }}>{opp.estimated_mrr_potential}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--status-amber-bg)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Price Point</p>
          <p className="text-sm font-bold" style={{ color: "var(--status-amber)" }}>{opp.recommended_price_point}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Demand Signals</p>
        <div className="flex flex-wrap gap-2">
          {(opp.demand_signals ?? []).map((signal, i) => (
            <span key={i} className="text-xs px-3 py-1 rounded-lg" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {signal}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: "var(--status-amber-bg)", border: "1px solid rgba(217,119,6,0.15)" }}>
        <p className="text-xs font-bold mb-1.5" style={{ color: "var(--status-amber)" }}>Queen Bee Assessment</p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{opp.queen_reasoning}</p>
      </div>

      {opp.status === "pending_approval" && (
        <div className="flex items-center gap-3 pt-1">
          <p className="text-sm flex-1" style={{ color: "var(--text-muted)" }}>HITL required — approve to proceed with Builder Bee</p>
          <button
            onClick={onReject}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--status-red-bg)", color: "var(--status-red)", border: "1px solid rgba(220,38,38,0.2)" }}
          >
            <XCircle className="w-4 h-4" />
            C&apos;est pas chill
          </button>
          <button
            onClick={onApprove}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--amber)", color: "#000", fontWeight: 700 }}
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </button>
        </div>
      )}
    </div>
  );
}
