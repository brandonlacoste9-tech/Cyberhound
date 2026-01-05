import { Lock, EyeOff } from 'lucide-react';

export default function MysteryTicker() {
  const triggerPaywall = () => { window.open("https://buy.stripe.com/7sYfZgdJP9Kdd4i95v1Fe08", "_blank"); };

  return (
    <div 
      onClick={triggerPaywall}
      className="mb-4 group border border-yellow-600/40 bg-yellow-900/10 p-4 rounded relative overflow-hidden cursor-pointer hover:border-yellow-500 transition-all hover:shadow-[0_0_15px_rgba(234,179,8,0.2)]"
    >
      {/* "PRO ONLY" BADGE */}
      <div className="absolute top-0 right-0 bg-yellow-600 text-black font-bold text-[10px] px-2 py-0.5 uppercase tracking-wider flex items-center gap-1 z-10">
          <Lock size={10} /> Pro Clearance
      </div>

      <div className="flex justify-between items-center mt-2 relative z-10">
          <div>
              {/* REDACTED NAME */}
              <div className="flex items-center gap-2 mb-1">
                  <span className="bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded text-[10px] border border-yellow-500/30">
                      ENTERPRISE
                  </span>
                  {/* BLURRED TEXT EFFECT */}
                  <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-600 select-none blur-[3px]">
                      SALESFORCE
                  </h3>
                  <EyeOff size={14} className="text-yellow-600 animate-pulse" />
              </div>

              {/* VISIBLE BAIT */}
              <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-green-400">FREE FOREVER</span>
                  <span className="text-xs text-yellow-100/60 italic">
                      (Was /mo)
                  </span>
              </div>
          </div>
      </div>
      
      {/* SCANLINE EFFECT OVERLAY */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_2px] pointer-events-none opacity-50"></div>
    </div>
  );
}

