import { useState, useEffect } from 'react'
import { Activity, Globe, Crosshair, Terminal, Zap, Shield, Wifi, Lock, Mail, Radio, ShieldAlert } from 'lucide-react'
import MysteryTicker from './components/MysteryTicker';

// --- Types ---
interface Deal {
  id: number;
  brand: string;
  summary: string;
  value_score: number;
  discount_amount: number;
  duration_months: number;
  url?: string;
  verdict?: string; 
}

interface IntelResponse {
  mission: string;
  extracted_intel: {
    Brand: string;
    Discount_Summary: string;
    Trial_Period: string;
    Verdict: string;
  }
}

// --- Status Components ---
const StatusBadge = ({ label, status }: { label: string, status: 'online' | 'offline' | 'busy' }) => (
  <div className="flex items-center space-x-2 border border-cyber-dim bg-cyber-black/50 px-3 py-1 rounded">
    <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-cyber-neon animate-pulse' : 'bg-cyber-alert'}`} />
    <span className="text-xs uppercase text-cyber-green font-mono tracking-widest">{label}</span>
    <span className="text-xs text-white/50">[{status.toUpperCase()}]</span>
  </div>
);

function App() {
  const [intel, setIntel] = useState<Deal[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [lastSniff, setLastSniff] = useState<IntelResponse | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
  };

  // Poll for "Latest Deals" (The Hot List)
  useEffect(() => {
    const fetchIntel = async () => {
      try {
        const apiUrl = import.meta.env.PROD 
           ? 'https://web-production-b9691.up.railway.app' 
           : 'http://localhost:5000';
           
        const res = await fetch(`${apiUrl}/api/intel`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setIntel(data);
        }
      } catch (e) {
        console.error("Link Failure:", e);
      }
    };

    fetchIntel();
    const interval = setInterval(fetchIntel, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleTestSniff = async () => {
    setScanning(true);
    addLog("Initiating Deal Sniff Protocol...");
    
    try {
        const apiUrl = import.meta.env.PROD 
           ? 'https://web-production-b9691.up.railway.app' 
           : 'http://localhost:5000';
           
        const res = await fetch(`${apiUrl}/api/test_sniff`);
        const data = await res.json();
        
        setLastSniff(data);
        addLog(`Sniff Complete. Verdict: ${data.extracted_intel?.Verdict || 'Unknown'}`);
    } catch (e) {
        console.error(e); 
        addLog("Critical Failure on Sniff Attempt.");
    } finally {
        setScanning(false);
    }
  };

  const triggerPaywall = () => { window.open("https://buy.stripe.com/7sYfZgdJP9Kdd4i95v1Fe08", "_blank"); };

  return (
    <div className="min-h-screen bg-cyber-black text-cyber-green font-mono overflow-hidden relative flex flex-col">
      
      {/* Background Grid & FX */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(rgba(0, 255, 65, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black z-0 pointer-events-none" />

      {/* --- HEADER --- */}
      <header className="relative z-10 border-b border-cyber-dim bg-cyber-black/80 backdrop-blur-sm p-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-cyber-neon/20 rounded-full blur-md group-hover:bg-cyber-neon/40 transition-all"></div>
            <img src="/logo.jpg" alt="Cyberhound" className="w-12 h-12 rounded-full border border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-[0.2em] text-white">CYBERHOUND <span className="text-cyber-neon">V3.2</span></h1>
            <p className="text-xs text-cyber-green/60">AUTONOMOUS INTEL UNIT // COLONY OS</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4">
           <button 
                onClick={triggerPaywall}
                className="flex items-center gap-2 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-500 hover:text-black border border-yellow-600 px-4 py-2 rounded transition-all text-xs font-bold tracking-wider hover:shadow-[0_0_15px_rgba(234,179,8,0.5)] group"
           >
                <Lock size={14} />
                UNLOCK PRO INTEL
           </button>

           <div className="flex space-x-2 md:space-x-4">
                <StatusBadge label="NOSE" status="online" />
                <StatusBadge label="BRAIN" status="online" />
                <StatusBadge label="LINK" status={scanning ? 'busy' : 'online'} />
           </div>
        </div>
      </header>

      {/* --- MAIN DASHBOARD LAYOUT --- */}
      <main className="relative z-10 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow overflow-hidden">
        
        {/* LEFT: HOUND STATUS & CONTROLS */}
        <section className="lg:col-span-3 space-y-6 flex flex-col h-full overflow-hidden">
            <div className="border border-cyber-dim bg-cyber-dark/80 p-4 rounded flex-shrink-0 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-cyber-neon/50 shadow-[0_0_10px_#00ff41]" />
                <h2 className="text-sm uppercase tracking-widest text-white mb-4 flex items-center">
                    <Shield className="w-4 h-4 mr-2" /> Active Operations
                </h2>
                <div className="space-y-4">
                    <div className="bg-cyber-black/50 p-3 rounded border border-cyber-dim">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-white">Adobe Cloud</span>
                           <span className="text-cyber-alert text-xs animate-pulse">HUNTING</span>
                        </div>
                        <div className="w-full bg-cyber-dim h-1 mt-2">
                           <div className="bg-cyber-neon h-1 w-[70%] animate-scan" />
                        </div>
                    </div>
                </div>
                <div className="mt-8">
                     <button 
                        onClick={handleTestSniff}
                        disabled={scanning}
                        className="w-full py-4 border border-cyber-neon text-cyber-neon hover:bg-cyber-neon hover:text-black transition-all font-bold tracking-widest flex justify-center items-center group-hover:shadow-[0_0_20px_rgba(0,255,65,0.3)]">
                        {scanning ? <Activity className="animate-spin mr-2" /> : <Crosshair className="mr-2" />}
                        {scanning ? 'INTERCEPTING...' : 'TRIGGER SNIFF PROTOCOL'}
                     </button>
                </div>
            </div>

            <div className="border border-cyber-dim bg-black p-4 rounded flex-grow flex flex-col font-mono text-xs overflow-hidden">
                 <h3 className="text-cyber-dim uppercase mb-2 flex items-center flex-shrink-0"><Terminal className="w-3 h-3 mr-2"/> System Logs</h3>
                 <div className="flex-grow overflow-y-auto space-y-1 scrollbar-hide">
                    {logs.map((log, i) => (
                        <div key={i} className="text-cyber-green/80 border-l-2 border-transparent hover:border-cyber-neon pl-2">
                            {log}
                        </div>
                    ))}
                    {logs.length === 0 && <span className="text-white/20 italic">System Ready.</span>}
                 </div>
            </div>
        </section>

        {/* CENTER: RADAR */}
        <section className="lg:col-span-6 relative border border-cyber-dim bg-cyber-dark overflow-hidden rounded flex items-center justify-center min-h-[300px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyber-dim/20 via-transparent to-black pointer-events-none" />
            <div className="w-[300px] h-[300px] md:w-[400px] md:h-[400px] border border-cyber-neon/10 rounded-full absolute animate-[pulse_4s_infinite]" />
            <div className="w-[150px] h-[150px] md:w-[200px] md:h-[200px] border border-cyber-neon/20 rounded-full absolute" />
            <div className="w-[2px] h-full bg-cyber-neon/10 absolute animate-[spin_5s_linear_infinite]" />
            <div className="z-10 text-center">
                <Globe className="w-16 h-16 text-cyber-neon mx-auto mb-4 opacity-80" />
                <h2 className="text-2xl text-white font-display tracking-widest">GLOBAL SCAN GRID</h2>
                <p className="text-cyber-green/60 uppercase text-xs mt-2">Monitoring 1,024 Nodes</p>
            </div>
        </section>

        {/* RIGHT: FEED */}
        <section className="lg:col-span-3 flex flex-col space-y-4 h-full overflow-hidden">
             <MysteryTicker />

             {lastSniff && (
                 <div className="border border-cyber-neon bg-cyber-neon/10 p-4 rounded animate-in fade-in slide-in-from-right duration-500 flex-shrink-0">
                    <h3 className="text-cyber-neon font-bold flex items-center mb-2">
                        <Zap className="w-4 h-4 mr-2" /> INTERCEPT CONFIRMED
                    </h3>
                    <div className="text-sm space-y-2 text-white/90">
                        <p><span className="text-cyber-green">TARGET:</span> {lastSniff.extracted_intel.Brand}</p>
                        <p><span className="text-cyber-green">DEAL:</span> {lastSniff.extracted_intel.Discount_Summary}</p>
                        <p><span className="text-cyber-green">VERDICT:</span> {lastSniff.extracted_intel.Verdict}</p>
                    </div>
                 </div>
             )}

             <div className="border border-cyber-dim bg-cyber-dark flex-grow overflow-hidden flex flex-col rounded">
                 <div className="p-3 border-b border-cyber-dim bg-cyber-black flex justify-between">
                    <span className="text-white text-xs uppercase">Recent Intercepts</span>
                    <Wifi className="w-4 h-4 text-cyber-green" />
                 </div>
                 <div className="p-4 space-y-3 overflow-y-auto flex-grow scrollbar-hide">
                    {intel.length === 0 ? (
                        <div className="text-center text-white/30 text-xs py-10">NO DATA STREAM</div>
                    ) : (
                        intel.map((deal) => (
                           <a key={deal.id} href={deal.url} target="_blank" rel="noreferrer" className="block bg-black/40 p-3 rounded border border-white/5 hover:border-cyber-green transition-colors cursor-pointer group">
                                <div className="flex justify-between items-start">
                                    <span className="text-cyber-neon font-bold">{deal.brand}</span>
                                    <span className="text-[10px] text-white/50">{deal.duration_months}MO</span>
                                </div>
                                <p className="text-white/80 text-xs mt-1 truncate">{deal.summary}</p>
                                <div className="mt-2 text-right flex justify-between items-center">
                                    <ShieldAlert size={12} className="text-cyber-dark group-hover:text-cyber-green transition-colors"/>
                                    <span className="text-[10px] bg-cyber-dim/50 px-2 py-1 rounded text-white group-hover:bg-cyber-neon group-hover:text-black">
                                        SCORE: {deal.value_score}
                                    </span>
                                </div>
                           </a>
                        ))
                    )}
                 </div>
             </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-cyber-dim bg-cyber-black/80 backdrop-blur-sm p-3 text-center flex-shrink-0">
            <div className="flex flex-row justify-center items-center gap-6 mb-1">
                <a href="mailto:intel@cyberhound.io" className="flex items-center gap-2 text-cyber-green/70 hover:text-cyber-neon transition-colors text-xs uppercase tracking-widest">
                    <Mail size={12} />
                    Encrypted Channel
                </a>
                <a href="#" className="flex items-center gap-2 text-cyber-green/70 hover:text-cyber-neon transition-colors text-xs uppercase tracking-widest">
                    <Radio size={12} />
                    Sponsor Signal
                </a>
            </div>
            <p className="text-cyber-dim text-[10px] font-mono">
                CYBERHOUND INDUSTRIES // EST 2026 // SECURE CONNECTION
            </p>
      </footer>
    </div>
  );
}

export default App;


