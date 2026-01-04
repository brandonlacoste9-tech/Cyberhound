import React from 'react';

export interface Deal {
    id: number;
    site_id: number;
    brand: string;
    summary: string;
    value_score: number;
    discount_amount: number;
    duration_months: number;
}

interface TickerProps {
    deals: Deal[];
}

const Ticker: React.FC<TickerProps> = ({ deals }) => {
    return (
        <div className="w-full bg-cyber-dark border-y border-cyber-dim overflow-hidden whitespace-nowrap py-2 relative select-none">
            <div className="inline-block animate-marquee hover:[animation-play-state:paused] uppercase text-xs font-bold tracking-widest text-cyber-green/80">
                {deals.map((deal) => (
                    <span key={deal.id} className="mx-8">
                        <span className="text-white">[{deal.brand}]</span> {deal.summary}
                        <span className="text-cyber-green mx-2 text-glow">
                            {deal.discount_amount > 0 && `-${deal.discount_amount}%`}
                        </span>
                        <span className="text-cyber-dim">::</span>
                        <span className="text-cyber-green ml-2">V_SCORE: {deal.value_score.toFixed(1)}</span>
                    </span>
                ))}
                {/* Duplicate for seamless loop */}
                {deals.map((deal) => (
                    <span key={`dup-${deal.id}`} className="mx-8">
                        <span className="text-white">[{deal.brand}]</span> {deal.summary}
                        <span className="text-cyber-green mx-2 text-glow">
                            {deal.discount_amount > 0 && `-${deal.discount_amount}%`}
                        </span>
                        <span className="text-cyber-dim">::</span>
                        <span className="text-cyber-green ml-2">V_SCORE: {deal.value_score.toFixed(1)}</span>
                    </span>
                ))}
            </div>
        </div>
    );
};

export default Ticker;
