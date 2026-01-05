import { useState, useEffect } from 'react';
import { Scan, ShieldAlert, Zap, Terminal, Lock, Mail, Radio, ExternalLink, Activity } from 'lucide-react';
import MysteryTicker from './components/MysteryTicker';

interface Deal {
  id: string;
  brand: string;
  title: string;
  summary: string;
  price: string;
  original_price?: string;
  discount?: string;
  url: string;
  image?: string;
  value_score: number;
  source: string;
}

function App() {
  const [intel, setIntel] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('IDLE');

  // CHANGE THIS TO YOUR RAILWAY BACKEND URL
  const API_URL = 'https://web-production-b9691.up.railway.app';

  const fetchIntel = async () => {
    setLoading(true);
    setStatus('ESTABLISHING NEURAL LINK...');
    try {
      const response = await fetch(${API_URL}/latest_deals.json);
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
    setStatus(SCANNING SECTOR: ...);
    try {
      const response = await fetch(${API_URL}/api/scan, { method: 'POST' });
      const data = await response.json();
      setStatus(SCAN COMPLETE:  TARGETS FOUND);
      fetchIntel(); 
    } catch (error) {
      console.error("Error triggering scan:", error);
      setStatus('SCAN FAILED');
      setLoading(false);
    }
  };

  const triggerPaywall = () => {
      window.open("https://buy.stripe.com/7sYfZgdJP9Kdd4i95v1Fe08", "_blank");
  };

  useEffect(() => {
    fetchIntel();
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-4 selection:bg-green-900 selection:text-white pb-24">
      {/* SCANLINE OVERLAY */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_4px,3px_100%]"></div>
      
      <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === LEFT COLUMN: COMMAND & CONTROL === */}
        <div className="lg:col-span-2">
            {/* HEADER */}
            <header className="flex flex-col md:flex-row justify-between items-center mb-12 border-b border-green-900 pb-6 gap-4">
            <div className="flex items-center gap-4">
                <img 
                    src="/logo.jpg" 
                    alt="Cyberhound" 
                    className="w-16 h-16 rounded-full border-2 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]" 
                />
                <div>
                <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-800">
                    CYBERHOUND
                </h1>
                <p className="text-xs text-green-700 tracking-[0.3em]">AUTONOMOUS INTEL UNIT V3.1</p>
                </div>
            </div>

            <button 
                onClick={triggerPaywall}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-black px-6 py-3 rounded font-bold transition-all shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:scale-105 border border-yellow-400"
            >
                <Lock size={18} />
                UNLOCK PRO INTEL
            </button>
            </header>

            {/* DASHBOARD WIDGETS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* STATUS BOX */}
                <div className="bg-green-900/10 border border-green-800 p-6 rounded-lg backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                        <Terminal size={18} />
                        <span className="text-sm opacity-75">SYSTEM STATUS</span>
                        </div>
                        <Activity size={18} className="animate-pulse text-green-400"/>
                    </div>
                    <div className="font-bold text-green-400 text-lg mb-2">{status}</div>
                    <div className="w-full bg-green-900/30 h-1 rounded overflow-hidden">
                        <div className={h-full bg-green-500 transition-all duration-1000 }></div>
                    </div>
                </div>

                {/* ACTION BOX */}
                <div className="bg-green-900/10 border border-green-800 p-6 rounded-lg backdrop-blur-sm flex items-center">
                    <button 
                        onClick={() => triggerScan('appsumo')}
                        disabled={loading}
                        className="w-full bg-green-700 hover:bg-green-600 text-black font-bold py-4 rounded flex justify-center items-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                    >
                        {loading ? <Zap className="animate-spin" /> : <Scan />}
                        {loading ? 'EXECUTING PROTOCOL...' : 'APPSUMO SCAN'}
                    </button>
                </div>
            </div>

            {/* MAP / DATA VISUALIZER (PLACEHOLDER) */}
            <div className="border border-green-900 bg-black/50 aspect-video rounded-lg flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-black to-black"></div>
                <div className="text-center relative z-10">
                    <div className="text-6xl mb-4 opacity-20 group-hover:opacity-40 transition-opacity">🌐</div>
                    <p className="text-green-700 tracking-widest text-xs">GLOBAL SCAN GRID // MONITORING 1,024 NODES</p>
                </div>
                {/* Rotating radar line */}
                <div className="absolute inset-0 border-t border-green-500/30 rounded-full animate-spin [animation-duration:4s]"></div>
            </div>
        </div>

        {/* === RIGHT COLUMN: INTEL FEED === */}
        <div className="lg:col-span-1 border-l border-green-900/30 pl-0 lg:pl-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-green-900 pb-2">
                <Radio size={18} className="animate-pulse" />
                RECENT INTERCEPTS
            </h2>

            <div className="space-y-4 h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
                
                {/* 1. THE MYSTERY TICKER (TEASER) */}
                <MysteryTicker />

                {/* 2. REAL DEALS (NOW WITH IMAGES!) */}
                {intel.length === 0 && !loading ? (
                    <div className="text-center py-10 border border-dashed border-green-900 rounded opacity-50">
                        <p>NO DATA STREAM</p>
                    </div>
                ) : (
                    intel.map((deal, idx) => (
                        <a 
                            key={idx} 
                            href={deal.url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="block group bg-green-900/5 border border-green-800/50 hover:border-green-400 hover:bg-green-900/20 transition-all rounded-lg overflow-hidden relative"
                        >
                            <div className="flex flex-row h-28">
                                {/* IMAGE SECTION */}
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

                                {/* CONTENT SECTION */}
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
                                    
                                    <div className="flex justify-between items-end mt-2">
                                        <div className="flex flex-col">
                                            <span className="text-xs line-through text-white/30">{deal.original_price}</span>
                                            <span className="text-lg font-bold text-yellow-500">{deal.price || deal.discount || 'VIEW DEAL'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </a>
                    ))
                )}
            </div>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/90 border-t border-green-900/50 py-2 px-4 backdrop-blur text-center text-[10px] text-green-800 flex justify-between items-center z-50">
            <div>CYBERHOUND OS v3.1</div>
            <div className="flex gap-4">
                <a href="mailto:cyberhoundog@gmail.com" className="hover:text-green-400">ENCRYPTED COMMS</a>
                <a href="#" className="hover:text-yellow-500 text-yellow-700">SPONSOR NODE</a>
            </div>
      </footer>
    </div>
  );
}

export default App;


