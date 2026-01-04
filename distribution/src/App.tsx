import React, { useEffect, useState } from 'react';
import Ticker, { Deal } from './components/Ticker';
import IntelGrid from './components/IntelGrid';
import Dashboard from './components/Dashboard';
import { SniperAlert } from './components/SniperAlert';
import { LiveActivity } from './components/LiveActivity';

function App() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'stream' | 'dashboard'>('stream');
  const [activity, setActivity] = useState<any[]>([]);

  const API_URL = 'http://localhost:5000/api/intel';
  const ACTIVITY_URL = 'http://localhost:5000/api/activity';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resIntel, resActivity] = await Promise.all([
          fetch(API_URL),
          fetch(ACTIVITY_URL)
        ]);

        if (resIntel.ok) {
          setDeals(await resIntel.json());
        }
        if (resActivity.ok) {
          setActivity(await resActivity.json());
        }
        setLoading(false);
      } catch (error) {
        console.error("Failed to sync:", error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen relative scanlines bg-black text-green-500 font-mono flex flex-col" style={{ backgroundColor: '#050505' }}>
      <div className="crt fixed inset-0 pointer-events-none z-50"></div>

      {/* Hero Background */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
        <img src="/hero.jpg" alt="Cyberhound AI" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black"></div>
      </div>

      {/* Activity Ticker (FOMO Layer) */}
      <div className="relative z-20">
        <LiveActivity events={activity} />
      </div>

      {/* Top Bar */}
      <header className="border-b border-green-900/30 p-4 flex justify-between items-center bg-black/80 backdrop-blur-sm relative z-20">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView('stream')}>
          <div className="w-8 h-8 border border-green-500 flex items-center justify-center animate-pulse">
            <span className="text-green-500 font-bold text-xl">C</span>
          </div>
          <h1 className="text-2xl font-bold tracking-[0.2em] text-glow hidden sm:block text-green-500">CYBERHOUND</h1>
        </div>
        <div className="text-xs text-green-500/50 flex gap-4">
          <span>SYS_STATUS: <span className={loading ? "text-yellow-500" : "text-green-500"}>{loading ? "SYNCING..." : "ONLINE"}</span></span>
          <span className="hidden sm:inline">NET_UPTIME: 99.9%</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative z-10">
        {view === 'stream' && (
          <>
            <Ticker deals={deals} />
            <main className="py-8 px-4 max-w-7xl mx-auto w-full">

              <div className="max-w-2xl mx-auto mb-12">
                <SniperAlert />
              </div>

              <div className="w-full mb-8 flex justify-between items-end border-b border-green-900/30 pb-2 mt-8">
                <div>
                  <h2 className="text-green-500 text-sm font-bold uppercase tracking-widest mb-1 shadow-green-500/50 drop-shadow-sm">[ DETECTED SIGNAL STREAMS ]</h2>
                  <p className="text-green-900 text-xs">Live intelligence feed vs. global sector benchmarks.</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-1 text-xs border border-green-500 bg-green-500 text-black font-bold">ALL</span>
                  <span className="px-2 py-1 text-xs border border-green-900 text-green-700 hover:text-green-500 cursor-pointer">SAAS</span>
                  <span className="px-2 py-1 text-xs border border-green-900 text-green-700 hover:text-green-500 cursor-pointer">INFRA</span>
                </div>
              </div>

              {deals.length === 0 && !loading && (
                <div className="text-center text-green-900/50 py-20 font-bold tracking-widest animate-pulse">NO ACTIVE SIGNALS DETECTED</div>
              )}

              {loading && (
                <div className="text-center text-green-500 py-20 font-bold tracking-widest animate-pulse">
                  SYSTEM SYNCING... <br />
                  <span className="text-xs text-green-900">ESTABLISHING UPLINK TO COLONY OS...</span>
                </div>
              )}

              <IntelGrid deals={deals} />
            </main>
          </>
        )}

        {view === 'dashboard' && (
          <main className="py-8 px-4 relative z-10">
            <Dashboard />
          </main>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-green-900/30 p-4 text-center text-xs text-green-900/50 mt-8 relative z-10 bg-black/80">
        CYBERHOUND INTELLIGENCE OS v1.0 //
        <span className="hover:text-green-500 cursor-pointer mx-2">SUBMIT_INTEL</span> //
        <span
          className={`cursor-pointer mx-2 ${view === 'dashboard' ? 'text-green-500 font-bold' : 'hover:text-green-500'}`}
          onClick={() => setView(view === 'stream' ? 'dashboard' : 'stream')}
        >
          [{view === 'stream' ? 'FOUNDER_MODE' : 'RETURN_STREAM'}]
        </span>
      </footer>
    </div>
  );
}

export default App;
