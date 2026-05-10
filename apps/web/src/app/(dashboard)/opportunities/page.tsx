"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Target, AlertCircle, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { useSupabaseBrowser } from "@/lib/supabase/use-supabase-browser";
import { PageHeader } from "@/components/ui/PageHeader";

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
  const { client: supabase, error: supabaseInitError, mounted: supabaseMounted } = useSupabaseBrowser();
  const [niche, setNiche]           = useState("");
  const [market, setMarket]         = useState("North America");
  const [loading, setLoading]       = useState(false);
  const [fetching, setFetching]     = useState(true);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [error, setError]           = useState<string | null>(null);
  const [scoutNotice, setScoutNotice] = useState<string | null>(null);

  const fetchOpportunities = useCallback(async () => {
    if (!supabase) return;
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
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    fetchOpportunities();
    const channel = supabase
      .channel("opportunities_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, fetchOpportunities)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchOpportunities]);

  async function handleScout() {
    if (!niche.trim() || loading) return;
    setLoading(true);
    setError(null);
    setScoutNotice(null);
    try {
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: niche.trim(), market }),
      });
      const data = await res.json();
      if (data.opportunity) {
        setNiche("");
        if (data.autoApproved) {
          setScoutNotice(
            data.builder?.launch
              ? "Strong signal — approved, built, and launched autonomously."
              : "Strong signal — approved and sent to Builder automatically."
          );
        } else if (data.autoRejected) {
          setScoutNotice("Weak signal — rejected autonomously. No manual queue created.");
        }
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

  async function handleApprove(opp: Opportunity) {
    if (!supabase) return;
    await supabase.from("opportunities").update({ status: "approved" }).eq("id", opp.id);
    await supabase.from("hive_log").insert({
      bee: "queen",
      action: `Opportunity approved by Brandon`,
      details: { opportunity_id: opp.id },
      status: "success",
    });
        
    // Trigger Builder Bee to generate landing page
    try {
      const res = await fetch("/api/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity: opp, action: "generate_copy" }),
      });
      const data = await res.json();
      if (data.error) {
        console.error("[Builder trigger]", data.error);
      }
    } catch (err) {
      console.error("[Builder trigger]", err);
    }
    
    fetchOpportunities();
  }

  async function handleReject(opp: Opportunity) {
    if (!supabase) return;
    await supabase.from("opportunities").update({ status: "rejected" }).eq("id", opp.id);
    await supabase.from("hive_log").insert({
      bee: "queen",
      action: `Opportunity vetoed — C'est pas chill`,
      details: { opportunity_id: opp.id },
      status: "vetoed",
    });
    fetchOpportunities();
  }

  if (!supabaseMounted) {
    return (
      <div className="py-4">
        <div className="card p-16 text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 spin" style={{ color: "var(--text-faint)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Connecting to colony database…</p>
        </div>
      </div>
    );
  }

  if (supabaseInitError) {
    return (
      <div className="space-y-6 py-2">
        <div className="card border border-red-500/25 p-8" style={{ background: "var(--status-red-bg)" }}>
          <p className="text-sm font-bold mb-2" style={{ color: "var(--status-red)" }}>Supabase not configured</p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{supabaseInitError}</p>
        </div>
      </div>
    );
  }

  if (!supabase) {
    return null;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<span aria-hidden>🔍</span>}
        title={<span className="text-gradient">Opportunities</span>}
        subtitle="Scout Bee market research — identify and approve high-MRR niches before Builder runs."
        actions={
          <button
            type="button"
            onClick={fetchOpportunities}
            disabled={fetching}
            className="btn-ghost gap-2 text-sm font-semibold"
          >
            <RefreshCw className={`h-4 w-4 ${fetching ? "spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <div className="card card-amber p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-lg" aria-hidden>
            🐝
          </span>
          <p className="text-sm font-bold tracking-tight" style={{ color: "var(--amber-bright)" }}>
            Deploy Scout Bee
          </p>
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
            type="button"
            onClick={handleScout}
            disabled={!niche.trim() || loading}
            className="btn-primary gap-2 px-5 py-2.5 text-sm"
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
        {scoutNotice && (
          <p className="mt-3 flex items-center gap-2 text-sm" style={{ color: "var(--status-green)" }}>
            <CheckCircle className="h-4 w-4 shrink-0" />
            {scoutNotice}
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
              onApprove={() => handleApprove(opp)}
              onReject={() => handleReject(opp)}
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
    <div className="card space-y-5 p-6 sm:p-7">
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
        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm" style={{ color: "var(--text-muted)" }}>
            HITL required — approve to proceed with Builder Bee
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onReject}
              className="btn-ghost gap-2 border-[rgba(220,38,38,0.25)] text-sm font-semibold"
              style={{ color: "var(--status-red)", background: "var(--status-red-bg)" }}
            >
              <XCircle className="h-4 w-4" />
              C&apos;est pas chill
            </button>
            <button type="button" onClick={onApprove} className="btn-primary gap-2 text-sm">
              <CheckCircle className="h-4 w-4" />
              Approve
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
