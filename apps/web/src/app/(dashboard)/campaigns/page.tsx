"use client";

import { useState } from "react";
import { Layers, ExternalLink, Loader2, CheckCircle, AlertCircle } from "lucide-react";

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

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [building, setBuilding] = useState(false);
  const [buildStep, setBuildStep] = useState("");

  async function handleBuildDemo() {
    setBuilding(true);
    setBuildStep("Generating landing page copy...");

    try {
      // Step 1: Generate copy
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
      setBuildStep("Copy generated ✅ — creating Stripe product...");

      // Step 2: Create demo campaign (no Stripe without key)
      const newCampaign: Campaign = {
        id: Date.now().toString(),
        name: copyData.copy?.pricing_name ?? "AI Dental Scheduler",
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Campaigns
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Builder Bee — active revenue campaigns and landing pages
          </p>
        </div>
        <button
          onClick={handleBuildDemo}
          disabled={building}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-60"
          style={{
            background: "rgba(251,191,36,0.15)",
            border: "1px solid rgba(251,191,36,0.3)",
            color: "var(--amber-400)",
          }}
        >
          {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
          {building ? "Building..." : "Build Demo Campaign"}
        </button>
      </div>

      {/* Build progress */}
      {buildStep && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
          style={{
            background: "rgba(251,191,36,0.06)",
            border: "1px solid rgba(251,191,36,0.15)",
            color: "var(--amber-400)",
          }}
        >
          {building ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 shrink-0" />
          )}
          {buildStep}
        </div>
      )}

      {/* Campaigns list */}
      {campaigns.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Layers className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            No campaigns yet
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
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

  const statusConfig = {
    building: { label: "Building", color: "var(--status-building)" },
    live: { label: "Live", color: "var(--status-closing)" },
    paused: { label: "Paused", color: "var(--text-muted)" },
  };

  const cfg = statusConfig[campaign.status];
  const copy = campaign.copy as Record<string, string> | undefined;

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              {campaign.name}
            </h3>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: `${cfg.color}18`,
                border: `1px solid ${cfg.color}30`,
                color: cfg.color,
              }}
            >
              {campaign.status === "live" && "● "}{cfg.label}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {campaign.niche}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black" style={{ color: "var(--status-closing)" }}>
            ${campaign.mrr}
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            MRR
          </p>
        </div>
      </div>

      {copy && (
        <div>
          <div
            className="rounded-lg p-4"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>
              {copy.headline}
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {copy.subheadline}
            </p>
          </div>

          <button
            onClick={() => setShowCopy(!showCopy)}
            className="text-xs mt-2 transition-opacity hover:opacity-80"
            style={{ color: "var(--amber-400)" }}
          >
            {showCopy ? "Hide" : "View"} full copy →
          </button>

          {showCopy && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Pain Points
                </p>
                <ul className="space-y-1">
                  {(copy.pain_points as unknown as string[] ?? []).map((p: string, i: number) => (
                    <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: "var(--text-secondary)" }}>
                      <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "var(--amber-400)" }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2">
                <span
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{
                    background: "rgba(251,191,36,0.15)",
                    border: "1px solid rgba(251,191,36,0.3)",
                    color: "var(--amber-400)",
                  }}
                >
                  {copy.cta_primary}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {campaign.payment_link && (
        <a
          href={campaign.payment_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
          style={{ color: "var(--status-building)" }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Stripe Payment Link
        </a>
      )}
    </div>
  );
}
