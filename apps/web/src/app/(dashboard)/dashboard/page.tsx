"use client";

import { useEffect, useState, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { 
  Activity, 
  Zap, 
  Target, 
  Globe,
  DollarSign,
  Send,
  User,
  Bot,
  Terminal,
  ShieldCheck,
  Search,
  MessageSquare,
  Mic,
  Eye,
  PenTool,
  Database
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

interface Message {
  role: 'user' | 'assistant';
  content: string;
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
  
  // Command Mind State
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "COMMANDER. THE HIVE IS SYNCHRONIZED. ISSUE YOUR DIRECTIVES." }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: hiveLogs } = await supabase
        .from("hive_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);
      setLogs((hiveLogs as HiveLog[]) || []);

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

      const { data: conLogs } = await supabase
        .from("consensus_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      setConsensus((conLogs as ConsensusLog[]) || []);
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [supabase]);

  const handleSendCommand = async () => {
    if (!input.trim() || isProcessing) return;
    
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsProcessing(true);

    try {
      // Direct Task Injection Logic
      const response = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMsg })
      });
      
      const data = await response.json();
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.message || "DIRECTIVE RECEIVED. SWARM INITIATED." 
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "COMMUNICATION GLITCH. DIRECTIVE CACHED FOR RETRY." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] text-slate-200 font-sans selection:bg-cyan-500/30">
      <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8">
        
        {/* ── SOVEREIGN HEADER ── */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-cyan-900/30 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
                Cyberhound <span className="text-cyan-400 not-italic">Overlord</span>
              </h1>
            </div>
            <p className="text-slate-500 font-mono text-xs tracking-widest pl-13">HIVE_OS v2.4.0 // SINGULARITY_ACTIVE</p>
          </div>
          <div className="flex items-center gap-6 bg-slate-900/40 p-3 rounded-2xl border border-white/5">
             <BeeStatus icon={<Search />} name="ORACLE" status="SEARCHING" />
             <BeeStatus icon={<PenTool />} name="CONTENT" status="WRITING" />
             <BeeStatus icon={<Mic />} name="VOICE" status="VOICING" />
             <BeeStatus icon={<Eye />} name="SHADOW" status="SPYING" />
          </div>
        </header>

        {/* ── THE TRIAD: Command | Pulse | Stats ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ── COLUMN 1: Command & Stream (8/12) ── */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* ── STATS ROW ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatTile title="TOTAL MRR" value={`$${stats.mrr}`} icon={<DollarSign />} color="text-green-400" />
              <StatTile title="SWARMS" value={stats.active_swarms} icon={<Globe />} color="text-cyan-400" />
              <StatTile title="VERIFIED LEADS" value={stats.total_leads} icon={<Target />} color="text-blue-400" />
              <StatTile title="NEURAL LOAD" value="14%" icon={<Zap />} color="text-amber-400" />
            </div>

            {/* ── QUEEN COMMAND TERMINAL ── */}
            <div className="glass-card flex flex-col h-[500px]">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-black tracking-widest text-white uppercase">Queen Command Terminal</span>
                </div>
                <div className="flex gap-1.5">
                   <div className="w-2 h-2 rounded-full bg-red-500/20 border border-red-500/50" />
                   <div className="w-2 h-2 rounded-full bg-amber-500/20 border border-amber-500/50" />
                   <div className="w-2 h-2 rounded-full bg-green-500/20 border border-green-500/50" />
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
                        {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`p-3 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-cyan-600 text-white rounded-tr-none' : 'bg-slate-900 border border-white/5 text-slate-300 rounded-tl-none'}`}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-white/5 border-t border-white/5">
                <div className="relative">
                  <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
                    placeholder="ISSUE A DIRECTIVE... (e.g. 'Build a high-ticket agency in Dubai')"
                    className="w-full bg-slate-950 border border-cyan-500/20 rounded-xl p-4 pr-16 text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-700"
                  />
                  <button 
                    onClick={handleSendCommand}
                    className="absolute right-2 top-2 p-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── HIVE ACTIVITY STREAM ── */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                   <Activity className="w-5 h-5 text-cyan-400" />
                   <h2 className="text-lg font-bold uppercase tracking-tight">Neural Hive Stream</h2>
                </div>
                <span className="text-[10px] font-mono text-slate-600">PULSE: 0.8ms</span>
              </div>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                    <div className={`w-1.5 h-1.5 rounded-full ${log.status === 'success' ? 'bg-green-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
                    <span className="text-slate-600 font-mono text-[10px] w-20">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                    <span className="text-cyan-400 font-black text-[10px] tracking-widest w-24 uppercase">{log.bee}</span>
                    <span className="text-slate-400 text-xs flex-1 truncate">{log.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── COLUMN 2: Oracle & Workforce (4/12) ── */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* ── ORACLE CONSENSUS ── */}
            <div className="glass-card p-6">
               <div className="flex items-center gap-2 mb-6">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-bold uppercase tracking-tight">The Oracle Pulse</h2>
               </div>
               <div className="space-y-6">
                  {consensus.map((con) => (
                    <div key={con.id} className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white truncate max-w-[150px]">{con.niche}</span>
                        <span className="text-cyan-400 font-mono text-[10px] font-black">{con.final_score}% ALPHA</span>
                      </div>
                      <div className="h-1 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-300"
                          style={{ width: `${con.final_score}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-3 italic">&quot;{con.rationale}&quot;</p>
                    </div>
                  ))}
               </div>
            </div>

            {/* ── WORKFORCE HUD ── */}
            <div className="glass-card p-6">
               <div className="flex items-center gap-2 mb-6">
                  <Database className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-bold uppercase tracking-tight">Workforce HUD</h2>
               </div>
               <div className="space-y-4">
                  <AgentStatusRow name="HERMES" role="ORACLE" pulse="ACTIVE" />
                  <AgentStatusRow name="ANALYST" role="OSINT" pulse="ACTIVE" />
                  <AgentStatusRow name="CMO BEE" role="CONTENT" pulse="IDLE" />
                  <AgentStatusRow name="COO BEE" role="VOICE" pulse="ACTIVE" />
                  <AgentStatusRow name="SHADOW" role="DEEP SPY" pulse="HUNTING" />
                  <AgentStatusRow name="CLOSER" role="OUTREACH" pulse="STRIKING" />
               </div>
            </div>

            {/* ── COMMAND INTEL ── */}
            <div className="glass-card p-6 border-cyan-500/10 bg-cyan-950/10">
               <div className="flex items-center gap-2 mb-4">
                  <Terminal className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-bold uppercase tracking-tight">Command Intel</h2>
               </div>
               <div className="space-y-3">
                  <CommandItem cmd="HUNT [Niche]" desc="Launch a new global swarm" />
                  <CommandItem cmd="STATUS" desc="Deep neural diagnostic" />
                  <CommandItem cmd="AUDIT" desc="Generate revenue/lead report" />
                  <CommandItem cmd="ORACLE [Query]" desc="Ask the Triple-Model Consensus" />
                  <CommandItem cmd="BOOST [ID]" desc="Prioritize a specific campaign" />
               </div>
            </div>

          </div>
        </div>
      </div>

      <style jsx>{`
        .glass-card {
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 24px;
          box-shadow: 0 12px 40px -12px rgba(0, 0, 0, 0.5);
        }
        .text-gradient-cyan {
          background: linear-gradient(135deg, #fff 0%, #00ffff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

interface StatTileProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

function StatTile({ title, value, icon, color }: StatTileProps) {
  return (
    <div className="glass-card p-4 flex flex-col gap-3 hover:border-cyan-500/20 transition-all cursor-default">
      <div className={`p-2 w-fit rounded-lg bg-white/5 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">{title}</p>
        <p className="text-2xl font-black text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

interface BeeStatusProps {
  icon: React.ReactNode;
  name: string;
  status: string;
}

function BeeStatus({ icon, name, status }: BeeStatusProps) {
  return (
    <div className="flex items-center gap-3 px-3">
      <div className="text-cyan-400 opacity-50">{icon}</div>
      <div className="hidden md:block">
        <p className="text-[9px] font-black text-slate-500 tracking-tighter">{name}</p>
        <p className="text-[10px] font-bold text-white tracking-widest">{status}</p>
      </div>
    </div>
  );
}

interface AgentStatusRowProps {
  name: string;
  role: string;
  pulse: string;
}

function AgentStatusRow({ name, role, pulse }: AgentStatusRowProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-transparent hover:border-white/5 transition-all">
      <div>
        <p className="text-xs font-bold text-white tracking-widest">{name}</p>
        <p className="text-[9px] text-slate-500 font-mono">{role}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-black tracking-widest ${pulse === 'IDLE' ? 'text-slate-600' : 'text-cyan-400'}`}>{pulse}</span>
        <div className={`w-1 h-1 rounded-full ${pulse === 'IDLE' ? 'bg-slate-700' : 'bg-cyan-400 shadow-[0_0_8px_#00ffff]'}`} />
      </div>
    </div>
  );
}

interface CommandItemProps {
  cmd: string;
  desc: string;
}

function CommandItem({ cmd, desc }: CommandItemProps) {
  return (
    <div className="group flex flex-col p-2 rounded-lg hover:bg-cyan-500/5 transition-all cursor-help border border-transparent hover:border-cyan-500/10">
       <span className="text-[11px] font-mono font-black text-cyan-400 tracking-wider group-hover:text-white transition-colors">{cmd}</span>
       <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">{desc}</span>
    </div>
  );
}
