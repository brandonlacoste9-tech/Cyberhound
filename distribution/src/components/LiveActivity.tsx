import React from 'react';

interface ActivityEvent {
    type: string;
    msg: string;
    time: string;
}

interface LiveActivityProps {
    events: ActivityEvent[];
}

export const LiveActivity: React.FC<LiveActivityProps> = ({ events }) => {
    return (
        <div className="bg-black border-b border-cyber-dim/50 text-[10px] py-1 px-4 flex gap-6 overflow-hidden relative z-50 h-6 items-center">
            <span className="text-cyber-green font-bold whitespace-nowrap min-w-max">[ NETWORK_ACTIVITY ]</span>
            <div className="flex gap-8 whitespace-nowrap animate-marquee">
                {events.length > 0 ? events.map((e, i) => (
                    <span key={i} className="flex gap-2 items-center text-cyber-dim">
                        <span className="text-cyber-green">[{e.time}]</span>
                        <span className={`font-bold ${e.type === 'SALE' ? 'text-white' : 'text-cyber-dim'}`}>{e.type}</span>:
                        <span className="text-cyber-green/80">{e.msg}</span>
                    </span>
                )) : (
                    <span className="text-cyber-dim animate-pulse">LISTENING FOR NETWORK TRAFFIC...</span>
                )}
            </div>

            {/* CSS for marquee animation if not in global css */}
            <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        .animate-marquee:hover {
            animation-play-state: paused;
        }
      `}</style>
        </div>
    );
};
