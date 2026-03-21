"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnalystLead {
  id: string;
  source: "upwork" | "churn" | "reddit";
  signal_type: string;
  title: string;
  url: string;
  company?: string;
  contact_name?: string;
  contact_email?: string;
  budget?: string;
  pain_point: string;
  urgency: "high" | "medium" | "low";
  recommended_service: string;
  personalization_hook: string;
  status: string;
  created_at: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const URGENCY_CONFIG = {
  high:   { label: "High",   bg: "rgba(239,68,68,0.15)",  color: "#ef4444" },
  medium: { label: "Medium", bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
  low:    { label: "Low",    bg: "rgba(107,114,128,0.15)", color: "#6b7280" },
};

const SOURCE_CONFIG = {
  upwork:  { label: "Upwork",  emoji: "💼", color: "#14a800" },
  churn:   { label: "Churn",   emoji: "🔄", color: "#f59e0b" },
  reddit:  { label: "Reddit",  emoji: "🔴", color: "#ff4500" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new:      { label: "New",      color: "#6b7280" },
  enriched: { label: "Enriched", color: "#3b82f6" },
  queued:   { label: "Queued",   color: "#f59e0b" },
  sent:     { label: "Sent",     color: "#10b981" },
  replied:  { label: "Replied",  color: "#8b5cf6" },
  skipped:  { label: "Skipped",  color: "#6b7280" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AnalystPage() {
  const [mode, setMode] = useState<"upwork" | "churn" | "reddit" | "all">("upwork");
  const [niche, setNiche] = useState("web development automation");
  const [competitors, setCompetitors] = useState("Zapier, Make.com, Monday.com");
  const [subreddits, setSubreddits] = useState("entrepreneur, smallbusiness, startups");
  const [keywords, setKeywords] = useState("automation tool, AI agent, workflow");
  const [limit, setLimit] = useState(10);

  const [scanning, setScanning] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [leads, setLeads] = useState<AnalystLead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [log, setLog] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"scan" | "leads">("scan");

  function addLog(msg: string) {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  }

  async function runScan() {
    setScanning(true);
    setLeads([]);
    setSelectedLeads(new Set());
    addLog(`Starting ${mode.toUpperCase()} scan...`);

    try {
      const body: Record<string, unknown> = { mode, limit, persist: true };
      if (mode === "upwork" || mode === "all") body.niche = niche;
      if (mode === "churn" || mode === "all") body.competitors = competitors.split(",").map((s) => s.trim());
      if (mode === "reddit" || mode === "all") {
        body.subreddits = subreddits.split(",").map((s) => s.trim());
        body.keywords = keywords.split(",").map((s) => s.trim());
      }

      const res = await fetch("/api/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");

      setLeads(data.leads ?? []);
      addLog(`Scan complete — ${data.leads_found} leads found (${data.high_urgency} high urgency)`);
      setActiveTab("leads");
    } catch (err) {
      addLog(`ERROR: ${(err as Error).message}`);
    } finally {
      setScanning(false);
    }
  }

  async function enrichSelected() {
    if (selectedLeads.size === 0) return;
    setEnriching(true);
    addLog(`Enriching ${selectedLeads.size} leads via Apollo.io...`);

    try {
      const toEnrich = leads
        .filter((l) => selectedLeads.has(l.id))
        .map((l) => ({ id: l.id, company: l.company ?? l.title, domain: undefined }));

      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: toEnrich, update_db: true }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enrichment failed");

      addLog(`Enrichment complete — ${data.enriched}/${data.total} leads enriched`);

      // Refresh leads from DB
      const refreshRes = await fetch("/api/analyst?status=all&limit=100");
      const refreshData = await refreshRes.json();
      setLeads(refreshData.leads ?? []);
    } catch (err) {
      addLog(`Enrichment ERROR: ${(err as Error).message}`);
    } finally {
      setEnriching(false);
    }
  }

  async function generateSequence(lead: AnalystLead) {
    if (!lead.contact_email) {
      addLog(`Cannot generate sequence — ${lead.company ?? lead.title} not enriched yet`);
      return;
    }
    addLog(`Generating signal-aware sequence for ${lead.contact_name ?? lead.company}...`);

    try {
      const res = await fetch("/api/closer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "from_lead", lead_id: lead.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sequence generation failed");

      addLog(`Sequence ready for ${lead.contact_name ?? lead.company} — HITL approval sent to Telegram`);
    } catch (err) {
      addLog(`Sequence ERROR: ${(err as Error).message}`);
    }
  }

  function toggleLead(id: string) {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((l) => l.id)));
    }
  }

  return (
    <div className="p-6 space-y-6" style={{ position: "relative", zIndex: 1 }}>
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
            Analyst{" "}
            <span className="text-gradient">Bee</span>
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Warm interception — Upwork · Churn · Reddit signal scanning
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: "rgba(59,130,246,0.1)",
            border: "1px solid rgba(59,130,246,0.25)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#3b82f6" }} />
          <span className="text-xs font-semibold" style={{ color: "#3b82f6" }}>
            Ready
          </span>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
        {(["scan", "leads"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all"
            style={{
              background: activeTab === tab ? "var(--bg-card)" : "transparent",
              color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
              border: activeTab === tab ? "1px solid var(--border)" : "1px solid transparent",
            }}
          >
            {tab === "leads" ? `Leads (${leads.length})` : "Scan"}
          </button>
        ))}
      </div>

      {/* ── Scan Tab ─────────────────────────────────── */}
      {activeTab === "scan" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Config panel */}
          <div className="xl:col-span-2 card p-5 space-y-5">
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              🎯 Scan Configuration
            </h3>

            {/* Mode selector */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "var(--text-muted)" }}>
                Mode
              </label>
              <div className="flex gap-2 flex-wrap">
                {(["upwork", "churn", "reddit", "all"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                    style={{
                      background: mode === m ? "var(--amber-dim)" : "var(--bg-muted)",
                      color: mode === m ? "var(--amber)" : "var(--text-muted)",
                      border: `1px solid ${mode === m ? "rgba(245,158,11,0.4)" : "var(--border)"}`,
                    }}
                  >
                    {m === "upwork" ? "💼 Upwork" : m === "churn" ? "🔄 Churn" : m === "reddit" ? "🔴 Reddit" : "⚡ All Modes"}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode-specific inputs */}
            {(mode === "upwork" || mode === "all") && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                  Target Niche
                </label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm"
                  style={{
                    background: "var(--bg-muted)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                  placeholder="e.g. web development automation"
                />
              </div>
            )}

            {(mode === "churn" || mode === "all") && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                  Competitors (comma-separated)
                </label>
                <input
                  type="text"
                  value={competitors}
                  onChange={(e) => setCompetitors(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm"
                  style={{
                    background: "var(--bg-muted)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                  placeholder="e.g. Zapier, Make.com, Monday.com"
                />
              </div>
            )}

            {(mode === "reddit" || mode === "all") && (
              <>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                    Subreddits (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={subreddits}
                    onChange={(e) => setSubreddits(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm"
                    style={{
                      background: "var(--bg-muted)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                    placeholder="e.g. entrepreneur, smallbusiness"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                    Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm"
                    style={{
                      background: "var(--bg-muted)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                    placeholder="e.g. automation tool, AI agent"
                  />
                </div>
              </>
            )}

            {/* Limit */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                Lead Limit: {limit}
              </label>
              <input
                type="range"
                min={5}
                max={30}
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="w-full"
                style={{ accentColor: "var(--amber)" }}
              />
            </div>

            {/* Run button */}
            <button
              onClick={runScan}
              disabled={scanning}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all"
              style={{
                background: scanning ? "var(--bg-muted)" : "var(--amber)",
                color: scanning ? "var(--text-muted)" : "#000",
                cursor: scanning ? "not-allowed" : "pointer",
                border: "none",
              }}
            >
              {scanning ? "🔍 Scanning..." : `🚀 Run ${mode.toUpperCase()} Scan`}
            </button>
          </div>

          {/* Activity log */}
          <div className="card p-5">
            <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              📡 Activity Log
            </h3>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {log.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  No activity yet. Run a scan to start.
                </p>
              ) : (
                log.map((entry, i) => (
                  <p
                    key={i}
                    className="text-xs font-mono"
                    style={{ color: entry.includes("ERROR") ? "#ef4444" : "var(--text-secondary)" }}
                  >
                    {entry}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Leads Tab ─────────────────────────────────── */}
      {activeTab === "leads" && (
        <div className="space-y-4">
          {/* Actions bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={toggleAll}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "var(--bg-muted)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              {selectedLeads.size === leads.length ? "Deselect All" : "Select All"}
            </button>

            {selectedLeads.size > 0 && (
              <>
                <button
                  onClick={enrichSelected}
                  disabled={enriching}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    background: enriching ? "var(--bg-muted)" : "rgba(59,130,246,0.15)",
                    border: "1px solid rgba(59,130,246,0.3)",
                    color: enriching ? "var(--text-muted)" : "#3b82f6",
                    cursor: enriching ? "not-allowed" : "pointer",
                  }}
                >
                  {enriching ? "🔬 Enriching..." : `🔬 Enrich ${selectedLeads.size} via Apollo`}
                </button>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {selectedLeads.size} selected
                </span>
              </>
            )}

            <button
              onClick={runScan}
              disabled={scanning}
              className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                background: "var(--amber-dim)",
                border: "1px solid rgba(245,158,11,0.3)",
                color: "var(--amber)",
                cursor: scanning ? "not-allowed" : "pointer",
              }}
            >
              {scanning ? "Scanning..." : "🔄 Re-scan"}
            </button>
          </div>

          {/* Leads list */}
          {leads.length === 0 ? (
            <div className="card p-16 text-center">
              <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                No leads yet
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Run a scan to find warm interception leads
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leads.map((lead) => {
                const urgencyCfg = URGENCY_CONFIG[lead.urgency] ?? URGENCY_CONFIG.medium;
                const sourceCfg = SOURCE_CONFIG[lead.source] ?? { label: lead.source, emoji: "📡", color: "#6b7280" };
                const statusCfg = STATUS_CONFIG[lead.status] ?? { label: lead.status, color: "#6b7280" };
                const isSelected = selectedLeads.has(lead.id);

                return (
                  <div
                    key={lead.id}
                    className="card p-4"
                    style={{
                      border: `1px solid ${isSelected ? "var(--amber)" : "var(--border)"}`,
                      transition: "border-color 0.15s",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleLead(lead.id)}
                        className="mt-1 shrink-0"
                        style={{ accentColor: "var(--amber)" }}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold" style={{ color: sourceCfg.color }}>
                            {sourceCfg.emoji} {sourceCfg.label}
                          </span>
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: urgencyCfg.bg, color: urgencyCfg.color }}
                          >
                            {urgencyCfg.label}
                          </span>
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "var(--bg-muted)", color: statusCfg.color }}
                          >
                            {statusCfg.label}
                          </span>
                          {lead.budget && (
                            <span className="text-[10px] font-semibold" style={{ color: "#10b981" }}>
                              💰 {lead.budget}
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-semibold mb-1 truncate" style={{ color: "var(--text-primary)" }}>
                          {lead.title}
                        </p>

                        <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                          <strong style={{ color: "var(--text-secondary)" }}>Pain:</strong> {lead.pain_point}
                        </p>

                        <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                          <strong style={{ color: "var(--text-secondary)" }}>Hook:</strong> {lead.personalization_hook}
                        </p>

                        {lead.contact_email && (
                          <p className="text-xs" style={{ color: "#3b82f6" }}>
                            📧 {lead.contact_name ?? "Contact"} — {lead.contact_email}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 shrink-0">
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-center"
                          style={{ background: "var(--bg-muted)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                        >
                          {lead.recommended_service}
                        </span>

                        {lead.contact_email && (
                          <button
                            onClick={() => generateSequence(lead)}
                            className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                            style={{
                              background: "var(--amber-dim)",
                              color: "var(--amber)",
                              border: "1px solid rgba(245,158,11,0.3)",
                              cursor: "pointer",
                            }}
                          >
                            ✉️ Generate Sequence
                          </button>
                        )}

                        {lead.url && (
                          <a
                            href={lead.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-semibold px-2 py-1 rounded-lg text-center"
                            style={{
                              background: "var(--bg-muted)",
                              color: "var(--text-muted)",
                              border: "1px solid var(--border)",
                              textDecoration: "none",
                            }}
                          >
                            🔗 View Source
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
