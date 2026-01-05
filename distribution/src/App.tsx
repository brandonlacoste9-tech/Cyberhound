import { useState, useEffect } from 'react';
import { Scan, ShieldAlert, Terminal, Lock, Unlock, Radio, ExternalLink, Activity, Megaphone, Grid, LayoutDashboard, Cpu, Globe, Wifi } from 'lucide-react';
import MysteryTicker from './components/MysteryTicker';

// --- DATA STRUCTURES ---
interface Deal {
  id: string;
  brand: string;
  title: string;
  summary: string;
  price: string;
  url: string;
  image?: string;
  value_score: number;
  source: string;
}

// 1. GHOST DATA (SIMULATION MODE)
const GHOST_INTEL: Deal[] = [
    { id: 'sim-1', brand: 'FLIPPER ZERO', title: 'Multi-tool Device for Geeks', summary: 'Restock detected. High demand item.', price: '.00', url: 'https://flipperzero.one/', value_score: 99, source: 'INTERCEPT', image: 'https://cdn.shopify.com/s/files/1/0556/4203/0246/files/flipper-zero-classic.png?v=1635345688' },
    { id: 'sim-2', brand: 'STARLINK', title: 'Standard Kit - Refurbished', summary: 'Hardware discount detected.', price: '.00', url: 'https://www.starlink.com/', value_score: 85, source: 'SATELLITE', image: 'https://api.starlink.com/public-files/hardware_v4_standard.png' },
    { id: 'sim-3', brand: 'PROTON', title: 'Proton Unlimited - Lifetime', summary: 'Privacy suite Black Friday extension.', price: '50% OFF', url: 'https://proton.me/', value_score: 92, source: 'ENCRYPTED', image: 'https://proton.me/images/logos/proton-logo-square.svg' }
];

const SPONSOR_DATA = [
    { id: 'ad-1', brand: 'JASPER.AI', headline: 'NEURAL CONTENT SYNTHESIS', hook: "Override writer's block. Generate marketing copy at 500% velocity.", cta: 'INITIATE TRIAL', category: 'AI / WRITING', color: 'text-purple-400', border: 'border-purple-500/50' },
    { id: 'ad-2', brand: 'NOTION', headline: 'SECOND BRAIN ARCHITECTURE', hook: 'Unified workspace protocol. Replace 5 legacy tools with 1 OS.', cta: 'DEPLOY WORKSPACE', category: 'PRODUCTIVITY', color: 'text-white', border: 'border-white/50' },
    { id: 'ad-3', brand: 'NORD VPN', headline: 'ENCRYPTED TUNNELING', hook: 'Mask your IP signature. Hunt deals from any geo-location without restriction.', cta: 'SECURE CONNECTION', category: 'SECURITY', color: 'text-blue-400', border: 'border-blue-500/50' },
    { id: 'ad-4', brand: 'RAILWAY', headline: 'CLOUD INFRASTRUCTURE', hook: 'Ship code instantly. The engine powering this very dashboard.', cta: 'PROVISION SERVER', category: 'DEV OPS', color: 'text-pink-400', border: 'border-pink-500/50' }
];

function App() {
  const [currentView, setCurrentView] = useState('COMMAND'); 
  const [intel, setIntel] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('SYSTEM OFF-LINE');
  const [isPro, setIsPro] = useState(false);

  const API_URL = 'https://web-production-b9691.up.railway.app';
  const MASTER_KEY = "HUNT-2026"; 

  useEffect(() => {
    const clearance = localStorage.getItem('cyberhound_clearance');
    if (clearance === MASTER_KEY) setIsPro(true);

    const bootUp = async () => {
        setStatus('INITIALIZING KERNEL...');
        await new Promise(r => setTimeout(r, 600));
        setStatus('LOADING NEURAL WEIGHTS...');
        await new Promise(r => setTimeout(r, 600));
        setStatus('DECRYPTING SECURE CHANNELS...');
        await new Promise(r => setTimeout(r, 600));
        setStatus('MOUNTING CYBER-HOUND OS v3.3...');
        await new Promise(r => setTimeout(r, 800));
        fetchIntel(); 
    };
    bootUp();
  }, []);

  const handleLogin = () => {
      if (isPro) return;
      const code = prompt("ENTER CLEARANCE CODE:", "");
      if (code === MASTER_KEY) {
          alert("ACCESS GRANTED.");
          localStorage.setItem('cyberhound_clearance', MASTER_KEY);
          setIsPro(true);
      } else if (code) alert("ACCESS DENIED. INVALID CLEARANCE.");
  };

  const fetchIntel = async () => {
    setLoading(true);
    setStatus('ESTABLISHING NEURAL LINK...');
    try {
      const response = await fetch(${API_URL}/latest_deals.json);
      const data = await response.json();
      const deals = Array.isArray(data) ? data : (data.extracted_intel || []);
      
      if (deals.length === 0) {
          setIntel(GHOST_INTEL);
          setStatus('SIMULATION MODE');
      } else {
          setIntel(deals);
          setStatus('TARGETS ACQUIRED');
      }
    } catch {
      setIntel(GHOST_INTEL);
      setStatus('OFFLINE MODE');
    } finally {
      setLoading(false);
    }
  };

  const triggerScan = async (target = "appsumo") => {
    setLoading(true);
    setStatus(SCANNING SECTOR: ...);
    try {
      const response = await fetch(${API_URL}/api/scan?target=, { method: 'POST' });
      const data = await response.json();
      setStatus(SCAN COMPLETE:  TARGETS FOUND);
      fetchIntel(); 
    } catch {
        setStatus('SCAN FAILED');
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-green-400 font-mono p-4 selection:bg-green-900 selection:text-white pb-24">
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_4px,3px_100%]"></div>
      
      <nav className="max-w-6xl mx-auto mb-8 flex justify-between items-center border-b border-green-900/50 pb-4 relative z-20">
          <div className="flex items-center gap-4">
            <img src="/logo.jpg" alt="Cyberhound" className="w-10 h-10 rounded-full border border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
            <span className="font-bold tracking-widest hidden md:block text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-800">CYBERHOUND OS</span>
          </div>
          <div className="flex bg-green-900/10 rounded p-1 gap-2 border border-green-900/30">
              <button onClick={() => setCurrentView('COMMAND')} className={lex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all }>
                  <LayoutDashboard size={14} /> SECTOR A
              </button>
              <button onClick={() => setCurrentView('ARMORY')} className={lex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all }>
                  <Grid size={14} /> SECTOR B
              </button>
          </div>
      </nav>

      {currentView === 'COMMAND' && (
          <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in zoom-in duration-300">
            
            <div className="lg:col-span-2 flex flex-col h-full gap-6">
                
                <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-white">HUNTING GROUNDS</h1>
                        <p className="text-xs text-green-600 tracking-[0.3em] font-bold">ACTIVE SURVEILLANCE FEED // v3.3</p>
                    </div>
                    <button onClick={handleLogin} className={lex items-center gap-2 px-6 py-3 rounded font-bold transition-all border }>
                        {isPro ? <><Unlock size={18} /> CLEARANCE: ACTIVE</> : <><Lock size={18} /> UNLOCK INTEL</>}
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-neutral-900/80 border border-green-800 p-6 rounded-lg backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-20"><Activity size={40} /></div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold opacity-75 flex gap-2 items-center"><Terminal size={14} /> SYSTEM STATUS</span>
                            <div className={w-2 h-2 rounded-full }></div>
                        </div>
                        <div className="font-mono font-bold text-green-400 text-lg tracking-tight">{status}</div>
                    </div>

                    <div className="bg-neutral-900/80 border border-green-800 p-6 rounded-lg backdrop-blur-sm flex items-center relative overflow-hidden group">
                        <div className={bsolute inset-0 bg-red-900/10 transition-opacity duration-500 }></div>
                        <div className="grid grid-cols-2 gap-3 w-full relative z-10">
                            <button onClick={() => triggerScan("appsumo")} disabled={loading} className={ont-black py-4 rounded flex justify-center items-center gap-2 transition-all disabled:opacity-50 }>
                                {loading ? <span className="animate-bounce text-xs">HUNTING...</span> : <><Scan size={16} /><span className="text-xs">APPSUMO</span></>}
                            </button>
                            <button onClick={() => triggerScan("amazon")} disabled={loading} className={ont-black py-4 rounded flex justify-center items-center gap-2 transition-all disabled:opacity-50 }>
                                {loading ? <span className="animate-bounce text-xs">HUNTING...</span> : <><Scan size={16} /><span className="text-xs">AMAZON</span></>}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grow border border-green-900/50 bg-black/40 rounded-lg relative overflow-hidden group min-h-[300px] flex items-center justify-center shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/10 via-black to-black"></div>
                    <div className="absolute inset-0 border-b border-green-500/20 origin-top animate-[spin_4s_linear_infinite]"></div>
                    <div className="text-center relative z-10">
                        <Globe size={64} className="mx-auto mb-4 text-green-800 group-hover:text-green-600 transition-colors duration-500" />
                        <p className="text-green-600 tracking-[0.5em] text-[10px] font-bold">GLOBAL SCAN GRID</p>
                        <p className="text-green-800 text-[9px] mt-2">MONITORING 1,024 NODES</p>
                    </div>
                </div>

                <div className="font-mono text-[10px] text-green-900 bg-black/50 p-2 rounded border border-green-900/30">
                    <p>&gt; ROOT ACCESS: GRANTED</p>
                    <p>&gt; ENCRYPTION: AES-256 [ACTIVE]</p>
                    <p className="animate-pulse">&gt; LISTENING FOR SIGNALS...</p>
                </div>

            </div>

            <div className="lg:col-span-1 border-l border-green-900/30 pl-0 lg:pl-8 flex flex-col h-[calc(100vh-180px)]">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-green-900 pb-2 text-green-100">
                    <Radio size={18} className="animate-pulse text-green-500" /> RECENT INTERCEPTS
                </h2>
                
                <div className="overflow-y-auto pr-2 custom-scrollbar space-y-4 pb-20">
                    <MysteryTicker unlocked={isPro} onUnlock={handleLogin} />
                    
                    <div className="group border border-yellow-600/30 bg-yellow-900/5 p-4 rounded relative overflow-hidden cursor-pointer hover:bg-yellow-900/10 transition-all" onClick={() => setCurrentView('ARMORY')}>
                        <div className="absolute top-0 right-0 bg-yellow-600/80 text-black text-[9px] px-2 py-0.5 font-bold uppercase">AD</div>
                        <div className="flex items-center gap-3">
                            <Megaphone size={16} className="text-yellow-500" />
                            <div>
                                <h4 className="text-yellow-500 font-bold text-sm">NEED MORE POWER?</h4>
                                <p className="text-xs text-yellow-100/70">Access the Alliance Grid.</p>
                            </div>
                        </div>
                    </div>

                    {intel.map((deal, idx) => (
                    <a key={idx} href={deal.url} target="_blank" rel="noreferrer" className="block group bg-neutral-900 border border-green-900 hover:border-green-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] transition-all rounded-lg overflow-hidden relative">
                        <div className="flex flex-row h-24">
                            <div className="w-24 h-full bg-black relative shrink-0 border-r border-green-900/50">
                                {deal.image ? (
                                    <img src={deal.image} alt={deal.brand} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-green-900 bg-green-950/30"><ShieldAlert size={20} /></div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-green-900/80 text-[9px] text-center text-white py-0.5 font-bold">
                                    {deal.value_score || 90}% MATCH
                                </div>
                            </div>
                            <div className="p-3 flex flex-col justify-between w-full relative">
                                <div>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[9px] text-green-600 uppercase tracking-wider font-bold">{deal.source}</span>
                                        <ExternalLink size={10} className="text-green-600 opacity-0 group-hover:opacity-100 transition-opacity"/>
                                    </div>
                                    <h3 className="font-bold text-xs md:text-sm leading-tight text-green-100 group-hover:text-green-400 transition-colors line-clamp-2">
                                        {deal.title || deal.brand}
                                    </h3>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold text-yellow-500">{deal.price}</span>
                                </div>
                            </div>
                        </div>
                    </a>
                    ))}
                </div>
            </div>
          </div>
      )}

      {currentView === 'ARMORY' && (
          <div className="max-w-6xl mx-auto relative z-10 animate-in fade-in slide-in-from-right duration-300">
              <header className="text-center mb-12">
                  <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 mb-2">THE ARMORY</h1>
                  <p className="text-yellow-600/80 tracking-[0.5em] text-sm">ALLIANCE NETWORK // SPONSORED NODES</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {SPONSOR_DATA.map((ad) => (
                      <div key={ad.id} className={g-neutral-900 border  p-6 rounded-lg relative overflow-hidden group hover:bg-neutral-800 transition-all hover:scale-[1.02] cursor-pointer shadow-lg}>
                          <div className="absolute top-0 right-0 bg-neutral-800 text-gray-400 text-[9px] px-2 py-1 font-bold border-bl border-l border-b border-gray-700">{ad.category}</div>
                          <Cpu size={32} className={mb-4 } />
                          <h3 className={	ext-2xl font-black mb-2 }>{ad.brand}</h3>
                          <div className="h-px w-10 bg-gray-700 mb-4"></div>
                          <h4 className="font-bold text-white mb-2 text-sm">{ad.headline}</h4>
                          <p className="text-gray-400 text-xs mb-6 leading-relaxed">{ad.hook}</p>
                          <button className={w-full py-2 border   text-xs font-bold hover:bg-white/5 transition-colors uppercase tracking-widest flex items-center justify-center gap-2}>
                              <ExternalLink size={12} /> {ad.cta}
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 bg-neutral-950/90 border-t border-green-900/50 py-2 px-4 backdrop-blur text-center text-[10px] text-green-800 flex justify-between items-center z-50">
            <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> CYBERHOUND OS v3.3 // {currentView} MODE</div>
            <div className="flex gap-4">
                <a href="mailto:cyberhoundog@gmail.com" className="hover:text-green-400 transition-colors flex items-center gap-1"><Wifi size={10} /> ENCRYPTED COMMS</a>
            </div>
      </footer>
    </div>
  );
}

export default App;
