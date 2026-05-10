"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";

interface OutreachEntry {
  id: string;
  campaign_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string | null;
  sequence_number: number | null;
  status: string;
  resend_id: string | null;
  created_at: string;
}

interface FollowUpSequence {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  company: string | null;
  total_emails: number;
  sent_count: number;
  current_step: number;
  next_send_at: string | null;
  status: string;
  created_at: string;
}

interface SchedulerStats {
  stats: { active: number; paused: number; completed: number; cancelled: number; failed: number };
  next_due: { next_send_at: string; recipient_email: string; current_step: number; total_emails: number } | null;
  total_sequences: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OutreachPage() {
  const [log, setLog] = useState<OutreachEntry[]>([]);
  const [sequences, setSequences] = useState<FollowUpSequence[]>([]);
  const [schedulerStats, setSchedulerStats] = useState<SchedulerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticking, setTicking] = useState(false);
  const [activeTab, setActiveTab] = useState<"log" | "sequences">("sequences");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [logRes, seqRes] = await Promise.all([
        fetch("/api/outreach?limit=50"),
        fetch("/api/scheduler", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "status" }) }),
      ]);

      if (logRes.ok) {
        const d = await logRes.json();
        setLog(d.log ?? d.entries ?? []);
      }

      if (seqRes.ok) {
        const d = await seqRes.json();
        setSchedulerStats(d);
      }

      // Fetch sequences from Supabase via analyst API
      const seqListRes = await fetch("/api/outreach/sequences?limit=50");
      if (seqListRes.ok) {
        const d = await seqListRes.json();
        setSequences(d.sequences ?? []);
      }
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function runTick() {
    setTicking(true);
    try {
      const res = await fetch("/api/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tick" }),
      });
      const data = await res.json();
      console.log("[Tick]", data);
      await loadData();
    } catch (err) {
      console.error("Tick error:", err);
    } finally {
      setTicking(false);
    }
  }

  async function controlSequence(id: string, action: "pause" | "resume" | "cancel") {
    await fetch("/api/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, sequence_id: id }),
    });
    await loadData();
  }

  const STATUS_COLORS: Record<string, string> = {
    active: "#10b981",
    paused: "#f59e0b",
    completed: "#6b7280",
    cancelled: "#ef4444",
    failed: "#ef4444",
    sent: "#10b981",
    pending: "#f59e0b",
  };

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<span aria-hidden>📧</span>}
        title={
          <>
            Outreach <span className="text-gradient">Center</span>
          </>
        }
        subtitle="Follow-up sequences, email log, and Scheduler Bee."
        actions={
          <button
            type="button"
            onClick={runTick}
            disabled={ticking}
            className="btn-primary gap-2 text-sm disabled:opacity-50"
          >
            {ticking ? "Running tick…" : "Run scheduler tick"}
          </button>
        }
      />

      {/* ── Scheduler Stats ──────────────────────────── */}
      {schedulerStats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(schedulerStats.stats).map(([key, val]) => (
            <div
              key={key}
              className="card p-3 text-center"
            >
              <p
                className="text-xl font-black"
                style={{ color: STATUS_COLORS[key] ?? "var(--text-primary)" }}
              >
                {val}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: "var(--text-muted)" }}>
                {key}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Next due */}
      {schedulerStats?.next_due && (
        <div
          className="card p-4 flex items-center gap-3"
          style={{ border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <span className="text-lg">⏰</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Next email due: {new Date(schedulerStats.next_due.next_send_at).toLocaleString()}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {schedulerStats.next_due.recipient_email} — Step {schedulerStats.next_due.current_step}/{schedulerStats.next_due.total_emails}
            </p>
          </div>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
        {(["sequences", "log"] as const).map((tab) => (
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
            {tab === "sequences" ? `Sequences (${sequences.length})` : `Email Log (${log.length})`}
          </button>
        ))}
      </div>

      {/* ── Sequences Tab ─────────────────────────────── */}
      {activeTab === "sequences" && (
        <div>
          {loading ? (
            <div className="card p-16 text-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading sequences...</p>
            </div>
          ) : sequences.length === 0 ? (
            <div className="card p-16 text-center">
              <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>No sequences yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Generate a sequence from the Analyst Bee or Campaigns page
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sequences.map((seq) => (
                <div key={seq.id} className="card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${STATUS_COLORS[seq.status] ?? "#6b7280"}20`,
                            color: STATUS_COLORS[seq.status] ?? "#6b7280",
                          }}
                        >
                          {seq.status.toUpperCase()}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {timeAgo(seq.created_at)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {seq.recipient_name ?? seq.recipient_email}
                        {seq.company && <span style={{ color: "var(--text-muted)" }}> @ {seq.company}</span>}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {seq.recipient_email}
                      </p>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            Progress: {seq.sent_count}/{seq.total_emails} emails sent
                          </span>
                          {seq.next_send_at && seq.status === "active" && (
                            <span className="text-[10px]" style={{ color: "var(--amber)" }}>
                              Next: {new Date(seq.next_send_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: "var(--bg-muted)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(seq.sent_count / seq.total_emails) * 100}%`,
                              background: "var(--amber)",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex gap-2 shrink-0">
                      {seq.status === "active" && (
                        <button
                          onClick={() => controlSequence(seq.id, "pause")}
                          className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                          style={{ background: "var(--bg-muted)", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}
                        >
                          ⏸ Pause
                        </button>
                      )}
                      {seq.status === "paused" && (
                        <button
                          onClick={() => controlSequence(seq.id, "resume")}
                          className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                          style={{ background: "var(--amber-dim)", color: "var(--amber)", border: "1px solid rgba(245,158,11,0.3)", cursor: "pointer" }}
                        >
                          ▶ Resume
                        </button>
                      )}
                      {(seq.status === "active" || seq.status === "paused") && (
                        <button
                          onClick={() => controlSequence(seq.id, "cancel")}
                          className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer" }}
                        >
                          ✕ Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Email Log Tab ─────────────────────────────── */}
      {activeTab === "log" && (
        <div>
          {loading ? (
            <div className="card p-16 text-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading log...</p>
            </div>
          ) : log.length === 0 ? (
            <div className="card p-16 text-center">
              <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>No emails sent yet</p>
            </div>
          ) : (
            <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
              {log.map((entry) => (
                <div key={entry.id} className="flex items-start gap-4 p-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ background: "var(--bg-muted)" }}
                  >
                    📧
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {entry.recipient_name ?? entry.recipient_email}
                      </span>
                      {entry.sequence_number && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}>
                          Email #{entry.sequence_number}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {timeAgo(entry.created_at)}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {entry.subject ?? "(no subject)"}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {entry.recipient_email}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      background: `${STATUS_COLORS[entry.status] ?? "#6b7280"}20`,
                      color: STATUS_COLORS[entry.status] ?? "#6b7280",
                    }}
                  >
                    {entry.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
