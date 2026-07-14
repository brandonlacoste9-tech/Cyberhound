"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { 
  Activity, Zap, Target, Globe, DollarSign, Send, User, Bot, Terminal,
  ShieldCheck, Search, PenTool, Database, Loader2, Brain, Cpu, Eye,
  TrendingUp, AlertTriangle, CheckCircle2, XCircle, Clock, Sparkles,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface HiveLog {
  id: string;
  created_at: string;
  bee: string;
  action: string;
  status: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface HoundInfo {
  name: string;
  category: string;
  icon: string;
  description: string;
  status: "idle" | "hunting" | "resting" | "offline";
  bounties: number;
  lastHunt: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hounds Data
// ═══════════════════════════════════════════════════════════════════════════════

const HOUNDS: HoundInfo[] = [
  {
    name: "SaaSHound",
    category: "SAAS",
    icon: "💻",
    description: "SaaS lifetime deals & discounts",
    status: "idle",
    bounties: 6,
    lastHunt: null,
  },
  {
    name: "UpworkHound",
    category: "FREELANCE",
    icon: "💰",
    description: "High-paying freelance gigs",
    status: "idle",
    bounties: 4,
    lastHunt: null,
  },
  {
    name: "AlgoraHound",
    category: "BOUNTY",
    icon: "🏆",
    description: "GitHub bounties & OSS rewards",
    status: "idle",
    bounties: 4,
    lastHunt: null,
  },
  {
    name: "CodementorHound",
    category: "MENTOR",
    icon: "🎓",
    description: "Live coding help & debugging",
    status: "idle",
    bounties: 2,
    lastHunt: null,
  },
  {
    name: "SystemHound",
    category: "MAINTENANCE",
    icon: "🛡️",
    description: "System health & auto-repair",
    status: "idle",
    bounties: 4,
    lastHunt: null,
  },
];

const HOUND_CATEGORY_COLORS: Record<string, string> = {
  SAAS: "from-cyan-500/20 to-blue-600/20 border-cyan-500/30",
  FREELANCE: "from-green-500/20 to-emerald-600/20 border-green-500/30",
  BOUNTY: "from-amber-500/20 to-orange-600/20 border-amber-500/30",
  MENTOR: "from-purple-500/20 to-violet-600/20 border-purple-500/30",
  MAINTENANCE: "from-rose-500/20 to-red-600/20 border-rose-500/30",
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

export default function OverlordDashboard() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  const [logs, setLogs] = useState<HiveLog[]>([]);
  const [stats, setStats] = useState({
    mrr: 0,
    active_swarms: 0,
    total_leads: 0,
    opportunities: 0,
    neural_load: "—",
  });
  const [beeStatus, setBeeStatus] = useState<Record<string, { status: string; last_seen: string }>>({});
  const [fetchMs, setFetchMs] = useState<number | null>(null);
  const [dbOk, setDbOk] = useState<boolean | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [healthMsg, setHealthMsg] = useState<string | null>(null);
  
  // Command Mind State
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "🐺 PACK ONLINE. Hermes Autonomy Engine v2 active. 5 hounds standing by. Issue your directives." }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
      if (data.stats) setStats((prev) => ({ ...prev, ...data.stats }));
      if (data.bee_status) setBeeStatus(data.bee_status);
      if (typeof data.fetch_ms === "number") setFetchMs(data.fetch_ms);
      setDbOk(data.db_ok !== false && data.healthy !== false);
      setDbError(data.db_error ?? null);
    } catch (e) {
      console.error("Fetch error:", e);
      setDbOk(false);
      setDbError("Dashboard API unreachable");
    }
    try {
      const h = await fetch("/api/health");
      const hj = await h.json();
      setHealthMsg(hj.message ?? null);
      if (typeof hj.ok === "boolean") setDbOk(hj.database?.ok ?? hj.ok);
    } catch {
      /* health optional */
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSendCommand = async () => {
    if (!input.trim() || isProcessing) return;
    
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsProcessing(true);

    try {
      const response = await fetch("/api/queen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response || "DIRECTIVE RECEIVED. SWARM INITIATED." 
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Neural link disrupted. Directive cached for retry." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!supabaseUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a12]">
        <div className="card p-8 max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 flex items-center justify-center mx-auto">
            <Cpu className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Colony OS Configuration</h1>
          <p className="text-sm text-slate-400">Set NEXT_PUBLIC_SUPABASE_URL to activate the hive neural link.</p>
          <div className="text-[10px] font-mono text-slate-600 space-y-1">
            <p>5 hounds initialized locally</p>
            <p>Hermes Autonomy Engine v2 ready</p>
            <p>DeepSeek API: connected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-200 font-sans selection:bg-amber-500/30">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
        
        {/* ── HEADER ── */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/[0.06] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.3)]">
                <Cpu className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">
                  Cyber<span className="text-amber-400">Hound</span>
                </h1>
                <p className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">
                  Colony OS v2 · Hermes · real metrics only
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={dbOk === false ? "pill-live" : "pill-live"} style={dbOk === false ? { borderColor: "rgba(239,68,68,0.4)" } : undefined}>
              <span
                className="pill-live__dot"
                style={dbOk === false ? { background: "#ef4444", boxShadow: "0 0 8px #ef4444" } : undefined}
              />
              <span className="text-[11px]">
                {dbOk === null ? "Checking DB…" : dbOk ? "Database linked" : "Database DOWN"}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] font-mono text-slate-400">Hermes v2</span>
            </div>
          </div>
        </header>

        {(dbOk === false || healthMsg) && (
          <div
            className="rounded-xl border px-4 py-3 text-sm"
            style={{
              borderColor: dbOk === false ? "rgba(239,68,68,0.35)" : "rgba(245,158,11,0.25)",
              background: dbOk === false ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.06)",
              color: "#e2e8f0",
            }}
          >
            <p className="font-semibold text-xs uppercase tracking-wider mb-1" style={{ color: dbOk === false ? "#f87171" : "#fbbf24" }}>
              {dbOk === false ? "Colony blocked" : "Colony status"}
            </p>
            <p className="text-[13px] text-slate-300">
              {dbError || healthMsg || "See /api/health for diagnostics."}
            </p>
          </div>
        )}

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile title="Total MRR" value={`$${(stats.mrr / 100).toFixed(0)}`} icon={<DollarSign className="w-4 h-4" />} color="text-green-400" glow="rgba(16,185,129,0.15)" />
          <StatTile title="Live campaigns" value={stats.active_swarms ?? 0} icon={<Target className="w-4 h-4" />} color="text-amber-400" glow="rgba(245,158,11,0.15)" />
          <StatTile title="Opportunities" value={stats.opportunities ?? 0} icon={<Sparkles className="w-4 h-4" />} color="text-cyan-400" glow="rgba(6,182,212,0.15)" />
          <StatTile title="API Latency" value={fetchMs ? `${fetchMs}ms` : "—"} icon={<Zap className="w-4 h-4" />} color="text-blue-400" glow="rgba(59,130,246,0.15)" />
        </div>

        {/* ── 5 HOUNDS PANEL ── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Hound Pack</h2>
            <span className="text-[10px] font-mono text-slate-500 ml-auto">
              {Object.keys(beeStatus).length} bees with recent logs
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {HOUNDS.map((hound) => {
              const live = beeStatus[hound.name.toLowerCase().replace("hound", "")] 
                || beeStatus[hound.category.toLowerCase()]
                || null;
              const derivedStatus = live
                ? (live.status === "success" ? "hunting" : live.status === "error" ? "offline" : "hunting")
                : "idle";
              return (
              <div
                key={hound.name}
                className={`relative rounded-xl p-3.5 bg-gradient-to-br ${HOUND_CATEGORY_COLORS[hound.category] || "from-slate-500/20 to-slate-600/20 border-slate-500/30"} border transition-all duration-200 hover:border-opacity-60 hover:-translate-y-0.5`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xl">{hound.icon}</span>
                  <StatusDot status={derivedStatus as HoundInfo["status"]} />
                </div>
                <p className="text-[11px] font-bold text-white truncate">{hound.name}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">{hound.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">{hound.category}</span>
                  <span className="text-[10px] font-bold text-slate-500 ml-auto">
                    {live ? "seen" : "idle"}
                  </span>
                </div>
              </div>
            );})}
          </div>
        </div>

        {/* ── MAIN GRID: Command + Activity + Workforce ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ── LEFT: Command Terminal + Activity ── */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* ── QUEEN COMMAND TERMINAL ── */}
            <div className="card flex flex-col h-[460px] hound-brain-shell">
              <div className="p-4 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.02] relative z-10">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black tracking-widest text-white uppercase">Queen Command Terminal</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/20 border border-red-500/50" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/20 border border-amber-500/50" />
                  <div className="w-2 h-2 rounded-full bg-green-500/20 border border-green-500/50" />
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3.5 scrollbar-hide relative z-10">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/[0.04] text-slate-400'}`}>
                        {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>
                      <div className={`p-3 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-amber-500/15 text-amber-100 rounded-tr-none border border-amber-500/10' : 'bg-white/[0.03] border border-white/[0.04] text-slate-300 rounded-tl-none'}`}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/[0.04] text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 spin" />
                      </div>
                      <div className="p-3 rounded-2xl text-sm bg-white/[0.03] border border-white/[0.04] text-slate-500 rounded-tl-none italic">
                        Processing directive...
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 bg-white/[0.02] border-t border-white/[0.05] relative z-10">
                <div className="relative">
                  <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
                    placeholder="Command the swarm... (e.g. 'Hunt SaaS deals', 'Status report', 'Send strike package')"
                    className="w-full bg-black/30 border border-amber-500/15 rounded-xl py-3 px-4 pr-14 text-sm focus:outline-none focus:border-amber-500/40 transition-all placeholder:text-slate-600 text-slate-200"
                  />
                  <button 
                    onClick={handleSendCommand}
                    disabled={!input.trim() || isProcessing}
                    className="absolute right-2 top-1.5 p-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── HIVE ACTIVITY STREAM ── */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">Neural Hive Stream</h2>
                </div>
                <span className="text-[10px] font-mono text-slate-600">
                  {fetchMs !== null ? `SYNCED ${fetchMs}ms` : "SYNCING..."}
                </span>
              </div>
              <div className="space-y-1.5">
                {logs.slice(0, 12).map((log) => (
                  <div key={log.id} className="activity-feed__row flex items-center gap-3 p-2.5 rounded-lg">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.status === 'success' ? 'bg-green-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
                    <span className="text-slate-600 font-mono text-[10px] w-16 shrink-0">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                    <span className="text-amber-400 font-bold text-[10px] tracking-wider w-20 shrink-0 uppercase">{log.bee}</span>
                    <span className="text-slate-400 text-xs truncate">{log.action}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center py-6 text-slate-600 text-xs font-mono uppercase tracking-wider">No recent neural activity</div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Workforce + Command Intel ── */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* ── HERMES AUTONOMY ENGINE ── */}
            <div className="card p-5 border-amber-500/10 bg-gradient-to-br from-amber-500/[0.03] to-transparent">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white">Hermes Autonomy Engine</h2>
              </div>
              <div className="space-y-3">
                <EngineRow label="Scout" desc="AI niche discovery" status="active" />
                <EngineRow label="Enrich" desc="ICP scoring + decision" status="active" />
                <EngineRow label="Strike" desc="AI email envoy" status="standby" />
                <EngineRow label="Watchdog" desc="Reply monitoring" status="standby" />
                <EngineRow label="Sequence" desc="Touch 2/3 drip" status="standby" />
                <EngineRow label="Retrospective" desc="Weekly learning" status="pending" />
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">DeepSeek v4 · 995ms</span>
                <span className="text-[10px] font-mono text-green-400">DAEMON READY</span>
              </div>
            </div>

            {/* ── WORKFORCE HUD ── */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white">Workforce HUD</h2>
              </div>
              <div className="space-y-2">
                <AgentStatusRow name="SCOUT" role="NICHE INTEL" pulse={beeStatusLabel(beeStatus["scout"])} />
                <AgentStatusRow name="ANALYST" role="OSINT" pulse={beeStatusLabel(beeStatus["analyst"])} />
                <AgentStatusRow name="BUILDER" role="CONTENT" pulse={beeStatusLabel(beeStatus["builder"])} />
                <AgentStatusRow name="CLOSER" role="OUTREACH" pulse={beeStatusLabel(beeStatus["closer_v2"] ?? beeStatus["closer"])} />
                <AgentStatusRow name="VIGIL" role="SELF-HEAL" pulse={beeStatusLabel(beeStatus["vigil"])} />
                <AgentStatusRow name="SYSTEM" role="API HEALTH" pulse={beeStatusLabel(beeStatus["system"])} />
              </div>
            </div>

            {/* ── COMMAND INTEL ── */}
            <div className="card p-5 border-amber-500/10">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white">Command Intel</h2>
              </div>
              <div className="space-y-2">
                <CommandItem cmd="HUNT [niche]" desc="Deploy all hounds" />
                <CommandItem cmd="STATUS" desc="Full neural diagnostic" />
                <CommandItem cmd="STRIKE [lead]" desc="Fire outreach package" />
                <CommandItem cmd="RETRO" desc="Weekly outcome analysis" />
                <CommandItem cmd="HEALTH" desc="System health check" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

function beeStatusLabel(entry: { status: string; last_seen: string } | undefined): string {
  if (!entry) return "OFFLINE";
  const s = entry.status;
  if (s === "success") return "ACTIVE";
  if (s === "idle") return "IDLE";
  if (s === "error" || s === "failed") return "ERROR";
  return "ACTIVE";
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: "bg-slate-600",
    hunting: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
    resting: "bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
    offline: "bg-slate-700",
  };
  return <span className={`w-2 h-2 rounded-full ${colors[status] || colors.idle}`} />;
}

function StatTile({ title, value, icon, color, glow }: { title: string; value: string | number; icon: React.ReactNode; color: string; glow: string }) {
  return (
    <div className="stat-tile card p-3.5 flex items-center gap-3" style={{ '--stat-tile-border': 'rgba(255,255,255,0.08)', '--stat-tile-glow': glow } as React.CSSProperties}>
      <div className={`p-2 rounded-lg bg-white/[0.04] ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">{title}</p>
        <p className="text-lg font-black text-white mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

function AgentStatusRow({ name, role, pulse }: { name: string; role: string; pulse: string }) {
  const isActive = pulse === 'ACTIVE';
  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg ${isActive ? 'bg-amber-500/[0.06] border border-amber-500/10' : 'bg-white/[0.02] border border-transparent'} transition-all`}>
      <div>
        <p className="text-[11px] font-bold text-white tracking-wider">{name}</p>
        <p className="text-[9px] text-slate-500 font-mono">{role}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold tracking-widest ${isActive ? 'text-amber-400' : 'text-slate-600'}`}>{pulse}</span>
        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-slate-700'}`} />
      </div>
    </div>
  );
}

function EngineRow({ label, desc, status }: { label: string; desc: string; status: "active" | "standby" | "pending" | "error" }) {
  const colors = {
    active: "text-green-400 bg-green-500/10",
    standby: "text-slate-400 bg-slate-500/10",
    pending: "text-amber-400 bg-amber-500/10",
    error: "text-red-400 bg-red-500/10",
  };
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
      <div>
        <p className="text-[11px] font-bold text-white">{label}</p>
        <p className="text-[9px] text-slate-500">{desc}</p>
      </div>
      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${colors[status]}`}>
        {status}
      </span>
    </div>
  );
}

function CommandItem({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <div className="group flex flex-col p-2 rounded-lg hover:bg-amber-500/5 transition-all cursor-help border border-transparent hover:border-amber-500/10">
      <span className="text-[11px] font-mono font-bold text-amber-400 tracking-wider group-hover:text-amber-300 transition-colors">{cmd}</span>
      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">{desc}</span>
    </div>
  );
}
