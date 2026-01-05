import { useState, useEffect } from 'react';
import { Scan, ShieldAlert, Terminal, Lock, Unlock, Radio, ExternalLink, Activity, Megaphone, Grid, LayoutDashboard, Cpu } from 'lucide-react';
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

// SIMULATED AI-GENERATED ADS (The "Barker" Output)
const SPONSOR_DATA = [
    {
        id: 'ad-1',
        brand: 'JASPER.AI',
        headline: 'NEURAL CONTENT SYNTHESIS',
        hook: "Override writer's block. Generate marketing copy at 500% velocity.",
        cta: 'INITIATE TRIAL',
        category: 'AI / WRITING',
        color: 'text-purple-400',
        border: 'border-purple-500/50'
    },
    {
        id: 'ad-2',
        brand: 'NOTION',
        headline: 'SECOND BRAIN ARCHITECTURE',
        hook: 'Unified workspace protocol. Replace 5 legacy tools with 1 OS.',
        cta: 'DEPLOY WORKSPACE',
        category: 'PRODUCTIVITY',
        color: 'text-white',
        border: 'border-white/50'
    },
    {
        id: 'ad-3',
        brand: 'NORD VPN',
        headline: 'ENCRYPTED TUNNELING',
        hook: 'Mask your IP signature. Hunt deals from any geo-location without restriction.',
        cta: 'SECURE CONNECTION',
        category: 'SECURITY',
        color: 'text-blue-400',
        border: 'border-blue-500/50'
    },
    {
        id: 'ad-4',
        brand: 'RAILWAY',
        headline: 'CLOUD INFRASTRUCTURE',
        hook: 'Ship code instantly. The engine powering this very dashboard.',
        cta: 'PROVISION SERVER',
        category: 'DEV OPS',
        color: 'text-pink-400',
        border: 'border-pink-500/50'
    }
];

function App() {
  // VIEW STATE: 'COMMAND' (Dashboard) or 'ARMORY' (Ads)
  const [currentView, setCurrentView] = useState('COMMAND'); 
  
  const [intel, setIntel] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('IDLE');
  const [isPro, setIsPro] = useState(false);

  // CHANGE THIS TO YOUR RAILWAY BACKEND URL
  const API_URL = 'https://web-production-b9691.up.railway.app';
  const MASTER_KEY = "HUNT-2026"; // Default clearance

  useEffect(() => {
    // 1. CHECK CLEARANCE
    const clearance = localStorage.getItem('cyberhound_clearance');
    if (clearance === MASTER_KEY) setIsPro(true);

    // 2. RUN CINEMATIC BOOT SEQUENCE
    const bootUp = async () => {
        setStatus('INITIALIZING KERNEL...');
        await new Promise(r => setTimeout(r, 600));
        
        setStatus('LOADING NEURAL WEIGHTS...');
        await new Promise(r => setTimeout(r, 600));
        
        setStatus('DECRYPTING SECURE CHANNELS...');
        await new Promise(r => setTimeout(r, 600));
        
        setStatus('MOUNTING CYBER-HOUND OS v3.3...');
        await new Promise(r => setTimeout(r, 800));

        // 3. START ACTUAL DATA FETCH
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
      } else {
        if (code) alert("ACCESS DENIED. INVALID CLEARANCE.");
      }
  };

  const fetchIntel = async () => {
    setLoading(true);
    setStatus('ESTABLISHING NEURAL LINK...');
    try {
      const response = await fetch(`${API_URL}/latest_deals.json`);
      const data = await response.json();
      // Handle potential data wrappers
      const deals = Array.isArray(data) ? data : (data.extracted_intel || []); 
      setIntel(deals);
      setStatus('TARGETS ACQUIRED');
    } catch (error) {
      console.error("Error fetching intel:", error);
      setStatus('CONNECTION ERROR - RETRYING');
    } finally {
      setLoading(false);
    }
  };

  const triggerScan = async (target = "appsumo") => {
    setLoading(true);
    setStatus(`SCANNING SECTOR: ${target.toUpperCase()}...`);
    try {
      const response = await fetch(`${API_URL}/api/scan?target=${target}`, { method: 'POST' });
      const data = await response.json();
      setStatus(`SCAN COMPLETE: ${data.intel_count || 0} TARGETS FOUND`);
      fetchIntel(); 
    } catch (error) {
        setStatus('SCAN FAILED');
        setLoading(false);
    }
  };
  
  // Pass unlock logic to ticker (in future if extended)
  const onUnlockRequest = () => {
    handleLogin();
  };

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-4 selection:bg-green-900 selection:text-white pb-24">
      {/* SCANLINE OVERLAY */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_4px,3px_100%]"></div>
      
      {/* === TOP NAVIGATION BAR === */}
      <nav className="max-w-6xl mx-auto mb-8 flex justify-between items-center border-b border-green-900/50 pb-4 relative z-20">
          <div className="flex items-center gap-4">
            <img src="/logo.jpg" alt="Cyberhound" className="w-10 h-10 rounded-full border border-green-500" />
            <span className="font-bold tracking-widest hidden md:block">CYBERHOUND OS</span>
          </div>

          <div className="flex bg-green-900/20 rounded p-1 gap-2">
              <button 
                onClick={() => setCurrentView('COMMAND')}
                className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all ${currentView === 'COMMAND' ? 'bg-green-600 text-black shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'hover:bg-green-900/50 text-green-700'}`}
              >
                  <LayoutDashboard size={14} /> SECTOR A: COMMAND
              </button>
              <button 
                onClick={() => setCurrentView('ARMORY')}
                className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all ${currentView === 'ARMORY' ? 'bg-yellow-600 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'hover:bg-yellow-900/20 text-yellow-700'}`}
              >
                  <Grid size={14} /> SECTOR B: ARMORY
              </button>
          </div>
      </nav>

      {/* === VIEW: SECTOR A (COMMAND DASHBOARD) === */}
      {currentView === 'COMMAND' && (
          <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in zoom-in duration-300">
            
            {/* LEFT COLUMN: CONTROLS */}
            <div className="lg:col-span-2">
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-800">
                            HUNTING GROUNDS
                        </h1>
                        <p className="text-xs text-green-700 tracking-[0.3em]">ACTIVE SURVEILLANCE FEED</p>
                    </div>
                    <button 
                        onClick={handleLogin}
                        className={`flex items-center gap-2 px-6 py-3 rounded font-bold transition-all border
                            ${isPro ? 'bg-green-900/50 text-green-400 border-green-500 cursor-default' : 'bg-yellow-600 hover:bg-yellow-500 text-black border-yellow-400 hover:scale-105'}`}
                    >
                        {isPro ? <><Unlock size={18} /> CLEARANCE: ACTIVE</> : <><Lock size={18} /> UNLOCK PRO INTEL</>}
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-green-900/10 border border-green-800 p-6 rounded-lg backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm opacity-75 flex gap-2"><Terminal size={18} /> STATUS</span>
                            <Activity size={18} className="animate-pulse text-green-400"/>
                        </div>
                        <div className="font-bold text-green-400 text-lg">{status}</div>
                    </div>

                    {/* ACTION BOX - "WHO LET THE DOGS OUT" EDITION */}
                    <div className="bg-green-900/10 border border-green-800 p-6 rounded-lg backdrop-blur-sm flex items-center relative overflow-hidden group">
                        {/* Background Pulse Effect */}
                        <div className={`absolute inset-0 bg-red-900/20 transition-opacity duration-500 ${loading ? 'opacity-100 animate-pulse' : 'opacity-0'}`}></div>
                        
                        <div className="grid grid-cols-2 gap-3 w-full relative z-10">
                            <button 
                                onClick={() => triggerScan("appsumo")}
                                disabled={loading}
                                className={`
                                    font-black py-4 rounded flex justify-center items-center gap-2 transition-all 
                                    disabled:opacity-80 disabled:cursor-not-allowed
                                    ${loading 
                                        ? 'bg-red-600 text-black shadow-[0_0_30px_rgba(220,38,38,0.6)]' 
                                        : 'bg-green-700 hover:bg-green-600 text-black hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                                    }
                                `}
                            >
                                {loading ? (
                                    <span className="tracking-widest animate-bounce">US! US!</span>
                                ) : (
                                    <>
                                        <Scan size={20} strokeWidth={3} />
                                        <span className="text-xs md:text-sm tracking-widest leading-none">WHO LET THE DOGS OUT?</span>
                                    </>
                                )}
                            </button>

                            <button 
                                onClick={() => triggerScan("amazon")}
                                disabled={loading}
                                className={`
                                    font-black py-4 rounded flex justify-center items-center gap-2 transition-all 
                                    disabled:opacity-80 disabled:cursor-not-allowed
                                    ${loading 
                                        ? 'bg-orange-600 text-black shadow-[0_0_30px_rgba(234,88,12,0.6)]' 
                                        : 'bg-orange-600 hover:bg-orange-500 text-black hover:shadow-[0_0_20px_rgba(234,88,12,0.4)]'
                                    }
                                `}
                            >
                                {loading ? (
                                    <span className="tracking-widest animate-bounce">US! US!</span>
                                ) : (
                                    <>
                                        <Scan size={20} strokeWidth={3} />
                                        <span className="text-xs md:text-sm tracking-widest leading-none">AMAZON SECTOR</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: FEED */}
            <div className="lg:col-span-1 border-l border-green-900/30 pl-0 lg:pl-8">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-green-900 pb-2">
                    <Radio size={18} className="animate-pulse" /> RECENT INTERCEPTS
                </h2>
                <div className="space-y-4 h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Only show ticker if it has relevant placeholder logic or data, for now keep it simple */}
                    <MysteryTicker unlocked={isPro} onUnlock={onUnlockRequest} />
                    
                    {/* SINGLE SPONSORED NODE (Not clogged) */}
                    <div className="group border border-yellow-600/30 bg-yellow-900/5 p-4 rounded relative overflow-hidden cursor-pointer hover:bg-yellow-900/10" onClick={() => setCurrentView('ARMORY')}>
                        <div className="absolute top-0 right-0 bg-yellow-600/80 text-black text-[9px] px-2 py-0.5 font-bold uppercase">AD</div>
                        <div className="flex items-center gap-3">
                            <Megaphone size={16} className="text-yellow-500" />
                            <div>
                                <h4 className="text-yellow-500 font-bold text-sm">NEED MORE POWER?</h4>
                                <p className="text-xs text-yellow-100/70">Access the Alliance Grid for AI tools.</p>
                            </div>
                        </div>
                    </div>

                    {intel.length === 0 && !loading ? (
                        <div className="text-center py-10 border border-dashed border-green-900 rounded opacity-50">
                            <p>NO DATA STREAM</p>
                        </div>
                    ) : (
                        intel.map((deal, idx) => (
                        <a key={idx} href={deal.url} target="_blank" rel="noreferrer" className="block group bg-green-900/5 border border-green-800/50 hover:border-green-400 hover:bg-green-900/20 transition-all rounded-lg overflow-hidden relative">
                            <div className="flex flex-row h-28">
                                <div className="w-28 h-full bg-black relative shrink-0">
                                    {deal.image ? (
                                        <img src={deal.image} alt={deal.brand} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-green-800 bg-green-900/20">
                                            <ShieldAlert size={24} />
                                        </div>
                                    )}
                                    {/* SCORE BADGE */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-[10px] text-center text-green-400 py-1 font-bold">
                                        SCORE: {deal.value_score || '90'}
                                    </div>
                                </div>
                                <div className="p-3 flex flex-col justify-between w-full relative">
                                    <div>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] text-green-600 uppercase tracking-wider">{deal.source || 'LTD'}</span>
                                            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                                        </div>
                                        <h3 className="font-bold text-sm leading-tight text-white group-hover:text-green-300 transition-colors line-clamp-2">
                                            {deal.title || deal.brand}
                                        </h3>
                                    </div>
                                    <div className="flex flex-col"><span className="text-lg font-bold text-yellow-500">{deal.price}</span></div>
                                </div>
                            </div>
                        </a>
                        ))
                    )}
                </div>
            </div>
          </div>
      )}

      {/* === VIEW: SECTOR B (THE ARMORY / AD PAGE) === */}
      {currentView === 'ARMORY' && (
          <div className="max-w-6xl mx-auto relative z-10 animate-in fade-in slide-in-from-right duration-300">
              <header className="text-center mb-12">
                  <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 mb-2">THE ARMORY</h1>
                  <p className="text-yellow-600/80 tracking-[0.5em] text-sm">ALLIANCE NETWORK // SPONSORED NODES</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {SPONSOR_DATA.map((ad) => (
                      <div key={ad.id} className={`bg-black/80 border ${ad.border} p-6 rounded-lg relative overflow-hidden group hover:bg-gray-900 transition-all hover:scale-[1.02] cursor-pointer`}>
                          <div className="absolute top-0 right-0 bg-gray-800 text-gray-400 text-[9px] px-2 py-1 font-bold">{ad.category}</div>
                          <Cpu size={32} className={`mb-4 ${ad.color}`} />
                          <h3 className={`text-2xl font-black mb-2 ${ad.color}`}>{ad.brand}</h3>
                          <div className="h-px w-10 bg-gray-700 mb-4"></div>
                          <h4 className="font-bold text-white mb-2 text-sm">{ad.headline}</h4>
                          <p className="text-gray-400 text-xs mb-6 leading-relaxed">{ad.hook}</p>
                          <button className={`w-full py-2 border ${ad.border} ${ad.color} text-xs font-bold hover:bg-white/5 transition-colors uppercase tracking-widest flex items-center justify-center gap-2`}>
                              <ExternalLink size={12} /> {ad.cta}
                          </button>
                      </div>
                  ))}
              </div>
              
              <div className="mt-16 text-center border-t border-gray-800 pt-8">
                  <p className="text-gray-500 text-xs mb-4">WANT TO INJECT YOUR SIGNAL HERE?</p>
                  <button className="bg-green-900/20 text-green-500 border border-green-900 px-6 py-2 rounded text-xs font-bold hover:bg-green-900/40">
                      [INITIATE SPONSOR PROTOCOL]
                  </button>
              </div>
          </div>
      )}

      {/* FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/90 border-t border-green-900/50 py-2 px-4 backdrop-blur text-center text-[10px] text-green-800 flex justify-between items-center z-50">
            <div>CYBERHOUND OS v3.3 // {currentView} MODE</div>
            <div className="flex gap-4">
                <a href="mailto:cyberhoundog@gmail.com" className="hover:text-green-400">ENCRYPTED COMMS</a>
            </div>
      </footer>
    </div>
  );
}

export default App;

