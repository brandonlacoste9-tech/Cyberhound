"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { 
  Activity, 
  Zap, 
  Target, 
  Cpu, 
  Globe,
  DollarSign
} from "lucide-react";

interface HiveLog {
  id: string;
  created_at: string;
  bee: string;
  action: string;
  status: string;
}

interface ConsensusLog {
  id: string;
  niche: string;
  final_score: number;
  rationale: string;
}

export default function OverlordDashboard() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [logs, setLogs] = useState<HiveLog[]>([]);
  const [stats, setStats] = useState({
    mrr: 0,
    active_swarms: 0,
    total_leads: 0,
    consensus_avg: 0 
  });
  const [consensus, setConsensus] = useState<ConsensusLog[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Hive Logs (Real Data)
      const { data: hiveLogs } = await supabase
        .from("hive_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      setLogs((hiveLogs as HiveLog[]) || []);

      // 2. Fetch Stats (Real Data)
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("mrr, status");
      
      const mrr = campaigns?.reduce((acc, curr) => acc + (curr.mrr || 0), 0) || 0;
      const active = campaigns?.filter(c => c.status === 'live').length || 0;
      
      const { count: leadCount } = await supabase
        .from("analyst_leads")
        .select("*", { count: 'exact', head: true });

      setStats({
        mrr,
        active_swarms: active,
        total_leads: leadCount || 0,
        consensus_avg: 0 
      });

      // 3. Fetch Consensus Logs (Real Data)
      const { data: conLogs } = await supabase
        .from("consensus_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      setConsensus((conLogs as ConsensusLog[]) || []);
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Pulse every 10s
    return () => clearInterval(interval);
  }, [supabase]);

  return (
    <div className="min-h-screen p-8 space-y-8 bg-[#1a1a2e]">
      {/* ── HEADER ── */}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-gradient-cyan">
            OVERLORD COMMAND DECK <span className="text-sm font-mono text-cyan-400 ml-2">V2.0_SOVEREIGN</span>
          </h1>
          <p className="text-slate-400 mt-2">Neural Operations: All Agents Synchronized.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="pill-live">
            <div className="pill-live__dot" />
            SWARM PERSISTENT
          </div>
        </div>
      </header>

      {/* ── STATS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="MONTHLY REVENUE" value={`$${stats.mrr}`} icon={<DollarSign className="text-cyan-400" />} />
        <StatCard title="ACTIVE SWARMS" value={stats.active_swarms} icon={<Globe className="text-cyan-400" />} />
        <StatCard title="TOTAL LEADS" value={stats.total_leads} icon={<Target className="text-cyan-400" />} />
        <StatCard title="HIVE PULSE" value="ACTIVE" icon={<Zap className="text-cyan-400" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── HIVE STREAM ── */}
        <div className="lg:col-span-2 glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-cyan-400" />
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">Neural Hive Stream</h2>
          </div>
          <div className="space-y-3 font-mono text-[10px] sm:text-xs max-h-[500px] overflow-y-auto scrollbar-hide">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-4 p-3 rounded border border-cyan-500/20 bg-cyan-950/20 group hover:bg-cyan-900/30 transition-colors">
                <span className="text-cyan-700">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                <span className="text-cyan-400 font-bold uppercase w-20">{log.bee}</span>
                <span className="text-slate-400 flex-1">{log.action}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.status === 'success' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                  {log.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── ORACLE PULSE ── */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="text-cyan-400" />
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">Oracle Pulse</h2>
          </div>
          <div className="space-y-6">
            {consensus.map((con) => (
              <div key={con.id} className="space-y-2 p-4 rounded-lg bg-slate-900/40 border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-bold truncate max-w-[180px]">{con.niche}</span>
                  <span className="text-cyan-400 font-mono font-bold tracking-widest">{con.final_score}% ALPHA</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-900 via-cyan-500 to-cyan-400 transition-all duration-1000"
                    style={{ width: `${con.final_score}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-tight line-clamp-2 mt-2">{con.rationale}</p>
              </div>
            ))}
            {consensus.length === 0 && (
              <div className="text-center py-12 text-slate-600 font-mono text-xs italic">
                Scanning grid for alpha signals...
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .text-gradient-cyan {
          background: linear-gradient(135deg, #00ffff 0%, #00d2ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .glass-card {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(0, 255, 255, 0.1);
          border-radius: 20px;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
        }
        .pill-live {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 1.2rem;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.15em;
          border: 1px solid rgba(0, 255, 255, 0.3);
          background: rgba(0, 255, 255, 0.05);
          color: #00ffff;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
        }
        .pill-live__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00ffff;
          box-shadow: 0 0 12px #00ffff;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="glass-card p-6 flex items-center justify-between hover:border-cyan-500/50 transition-all cursor-default group hover:translate-y-[-2px]">
      <div>
        <p className="text-[10px] font-black text-slate-500 tracking-[0.25em] uppercase">{title}</p>
        <p className="text-3xl font-black text-white mt-1 group-hover:text-cyan-400 transition-colors tracking-tighter">{value}</p>
      </div>
      <div className="p-3 bg-cyan-900/20 rounded-2xl group-hover:bg-cyan-900/40 transition-colors border border-cyan-500/10">
        {icon}
      </div>
    </div>
  );
}
