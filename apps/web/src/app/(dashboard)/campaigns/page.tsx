"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Layers,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Globe,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

interface Campaign {
  id: string;
  name: string;
  niche: string;
  status: string;
  mrr: number;
  customers: number;
  payment_link?: string;
  landing_page_url?: string | null;
  copy?: Record<string, unknown>;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  building: {
    label: "Building",
    color: "var(--status-blue)",
    bg: "var(--status-blue-bg)",
  },
  live: {
    label: "Live",
    color: "var(--status-green)",
    bg: "var(--status-green-bg)",
  },
  paused: {
    label: "Paused",
    color: "var(--status-gray)",
    bg: "var(--status-gray-bg)",
  },
  idle: {
    label: "Idle",
    color: "var(--status-gray)",
    bg: "var(--status-gray-bg)",
  },
  hunting: {
    label: "Hunting",
    color: "var(--status-amber)",
    bg: "var(--status-amber-bg)",
  },
  closing: {
    label: "Closing",
    color: "var(--status-green)",
    bg: "var(--status-green-bg)",
  },
};

function statusCfg(status: string) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [buildStep, setBuildStep] = useState("");

  const loadCampaigns = useCallback(async () => {
    setListLoading(true);
    try {
      const r = await fetch("/api/campaigns");
      const j = (await r.json()) as { campaigns?: Campaign[] };
      const raw = j.campaigns ?? [];
      setCampaigns(
        raw.map((c) => ({
          ...c,
          niche: c.name,
        }))
      );
    } catch {
      setCampaigns([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  async function triggerManualHunt() {
    if (!confirm("Dispatch the Hive for a global North American hunt?")) return;
    setBuilding(true);
    setBuildStep("Queen dispatching bees...");
    try {
      const res = await fetch("/api/cron/hunt", {
        headers: { Authorization: "Bearer cyberhound-scheduler" }
      });
      if (!res.ok) throw new Error();
      setBuildStep("Success. Refreshing hive...");
      setTimeout(() => {
        setBuilding(false);
        loadCampaigns();
      }, 2000);
    } catch {
      alert("Dispatch failed. Check logs.");
      setBuilding(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Layers className="w-6 h-6" style={{ color: "var(--status-amber)" }} />}
        title="Campaigns"
        subtitle="Builder Bee — live campaigns, payment links, and public landing pages."
        actions={
          <button
            type="button"
            onClick={triggerManualHunt}
            disabled={building}
            className="btn-amber gap-2"
          >
            {building ? (
              <>
                <Loader2 className="w-4 h-4 spin" />
                {buildStep}
              </>
            ) : (
              <>Trigger manual hunt</>
            )}
          </button>
        }
      />

      {listLoading && campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 spin" style={{ color: "var(--text-faint)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            Scanning the hive for active campaigns...
          </p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card p-12 text-center border-dashed">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <span className="text-2xl">🐝</span>
            </div>
          </div>
          <h3 className="text-lg font-bold mb-2">No Active Campaigns</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            The Hive is currently idle. Trigger a manual hunt or wait for the autonomous scheduler to pick a niche.
          </p>
          <button onClick={triggerManualHunt} className="btn-amber">Dispatch Hunt Bee</button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const [showCopy, setShowCopy] = useState(false);
  const cfg = statusCfg(campaign.status);
  const copy = campaign.copy as Record<string, string> | undefined;
  const mrrDisplay = ((campaign.mrr || 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <div className="card p-6 space-y-4">
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
            ${mrrDisplay}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            MRR
          </p>
        </div>
      </div>

      {campaign.landing_page_url && (
        <a
          href={campaign.landing_page_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ color: "var(--status-green)" }}
        >
          <Globe className="w-4 h-4" />
          Public landing page
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
      )}

      {copy && Object.keys(copy).length > 0 && (
        <div>
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}
          >
            <p className="text-base font-bold mb-1" style={{ color: "var(--text-primary)" }}>
              {String(copy.headline || "Building Copy...")}
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {String(copy.subheadline || "")}
            </p>
          </div>

          <button
            type="button"
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
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Pain Points
                </p>
                <ul className="space-y-1.5">
                  {((copy.pain_points as unknown as string[]) ?? []).map((p: string, i: number) => (
                    <li
                      key={i}
                      className="text-sm flex items-start gap-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--status-amber)" }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              {copy.cta_primary && (
                <span
                  className="inline-block px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: "var(--text-primary)", color: "#ffffff" }}
                >
                  {String(copy.cta_primary)}
                </span>
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
