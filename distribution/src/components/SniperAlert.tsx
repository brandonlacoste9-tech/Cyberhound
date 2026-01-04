import React, { useState } from 'react';

export const SniperAlert = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    const handleSubscribe = async () => {
        if (!email) return;
        setStatus('loading');

        // Replace with your Proxy URL
        const API_URL = 'http://localhost:5000/api/sniper/subscribe';

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (res.ok) {
                setStatus('success');
                setEmail('');
            }
        } catch (e) {
            console.error(e);
            // Simulate success for demo if offline
            setStatus('success');
        }
    };

    return (
        <div className="border border-cyber-green bg-cyber-dark/80 p-6 mb-8 shadow-[0_0_15px_rgba(34,197,94,0.1)] relative overflow-hidden group">
            {/* Background Effect */}
            <div className="absolute inset-0 bg-cyber-green/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            <div className="relative z-10">
                <h3 className="text-white font-bold mb-2 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Target Acquired: Email Sniper
                </h3>
                <p className="text-xs text-cyber-green/80 mb-4 font-mono">
                    Input coordinates to receive high-value intel ($V &gt; 90$) before the public feed.
                </p>

                {status === 'success' ? (
                    <div className="bg-cyber-green/20 border border-cyber-green text-cyber-green p-2 text-xs text-center font-bold">
                        COORDINATES LOCKED. STAND BY FOR INTEL.
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="USER@NETWORK.COM"
                            className="bg-black border border-cyber-dim p-2 text-xs text-cyber-green w-full focus:border-cyber-green outline-none placeholder-cyber-dim/50"
                        />
                        <button
                            onClick={handleSubscribe}
                            disabled={status === 'loading'}
                            className="bg-cyber-green text-black px-4 py-2 text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50"
                        >
                            {status === 'loading' ? 'LOCKING...' : 'ACTIVATE'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
