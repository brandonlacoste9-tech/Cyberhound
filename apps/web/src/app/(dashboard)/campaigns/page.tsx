"use client";

import { useState } from "react";
import { Layers, ExternalLink, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  niche: string;
  status: "building" | "live" | "paused";
  mrr: number;
  customers: number;
  payment_link?: string;
  copy?: Record<string, unknown>;
}

const STATUS_CONFIG = {
  building: { label: "Building", color: "var(--status-blue)",  bg: "var(--status-blue-bg)"  },
  live:     { label: "Live",     color: "var(--status-green)", bg: "var(--status-green-bg)" },
  paused:   { label: "Paused",   color: "var(--status-gray)",  bg: "var(--status-gray-bg)"  },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [building, setBuilding] = useState(false);
  const [buildStep, setBuildStep] = useState("");

  async function handleBuildDemo() {
    setBuilding(true);
    setBuildStep("Generating landing page copy...");
    try {
      const copyRes = await fetch("/api/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_copy",
          opportunity: {
            niche: "AI Scheduling for Dental Clinics",
            market: "North America",
            recommended_price_point: "$197/mo",
            estimated_mrr_potential: "$5K-$20K/mo",
            queen_reasoning: "Dental clinics waste 8+ hours/week on scheduling. AI automation is a clear ROI win.",
          },
        }),
      });
      const copyData = await copyRes.json();
      setBuildStep("Copy generated — creating campaign...");

      const newCampaign: Campaign = {
        id: Date.now().toString(),
        name: (copyData.copy?.pricing_name as string) ?? "AI Dental Scheduler",
        niche: "AI Scheduling for Dental Clinics",
        status: "building",
        mrr: 0,
        customers: 0,
        copy: copyData.copy,
      };

      setCampaigns((prev) => [newCampaign, ...prev]);
      setBuildStep("Campaign created — awaiting HITL approval to go live");

      setTimeout(() => {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === newCampaign.id ? { ...c, status: "live" } : c))
        );
        setBuildStep("");
        setBuilding(false);
      }, 2000);
    } catch {
      setBuildStep("Build failed — check API configuration");
      setBuilding(false);
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Campaigns
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Builder Bee — active revenue campaigns and landing pages
          </p>
        </div>
        <button
          onClick={handleBuildDemo}
          disabled={building}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: "var(--text-primary)", color: "#ffffff" }}
        >
          {building ? <Loader2 className="w-4 h-4 spin" /> : <Layers className="w-4 h-4" />}
          {building ? "Building..." : "Build Demo Campaign"}
        </button>
      </div>

      {/* ── Build progress ───────────────────────────── */}
      {buildStep && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{
            background: "var(--status-blue-bg)",
            border: "1px solid rgba(37,99,235,0.15)",
            color: "var(--status-blue)",
          }}
        >
          {building ? (
            <Loader2 className="w-4 h-4 spin shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 shrink-0" />
          )}
          {buildStep}
        </div>
      )}

      {/* ── Campaigns list ───────────────────────────── */}
      {campaigns.length === 0 ? (
        <div className="card p-16 text-center">
          <Layers className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-faint)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            No campaigns yet
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Approve an opportunity to trigger Builder Bee, or click &quot;Build Demo Campaign&quot;
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const [showCopy, setShowCopy] = useState(false);
  const cfg = STATUS_CONFIG[campaign.status];
  const copy = campaign.copy as Record<string, string> | undefined;

  return (
    <div className="card p-6 space-y-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              {campaign.name}
            </h3>
            <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
              {cfg.label}
            </span>
          </div>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {campaign.niche}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold" style={{ color: "var(--status-green)" }}>
            ${campaign.mrr}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>MRR</p>
        </div>
      </div>

      {/* Copy preview */}
      {copy && (
        <div>
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}
          >
            <p className="text-base font-bold mb-1" style={{ color: "var(--text-primary)" }}>
              {copy.headline}
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {copy.subheadline}
            </p>
          </div>

          <button
            onClick={() => setShowCopy(!showCopy)}
            className="flex items-center gap-1 text-xs mt-2 font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {showCopy ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showCopy ? "Hide" : "View"} full copy
          </button>

          {showCopy && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  Pain Points
                </p>
                <ul className="space-y-1.5">
                  {((copy.pain_points as unknown as string[]) ?? []).map((p: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2" style={{ color: "var(--text-secondary)" }}>
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--status-amber)" }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              {copy.cta_primary && (
                <button
                  className="px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: "var(--text-primary)", color: "#ffffff" }}
                >
                  {copy.cta_primary}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {campaign.payment_link && (
        <a
          href={campaign.payment_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: "var(--status-blue)" }}
        >
          <ExternalLink className="w-4 h-4" />
          Stripe Payment Link
        </a>
      )}
    </div>
  );
}
