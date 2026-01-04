import React from 'react';
import { Deal } from './Ticker';

interface IntelGridProps {
    deals: Deal[];
}

const IntelGrid: React.FC<IntelGridProps> = ({ deals }) => {
    return (
        <div className="p-4 w-full max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deals.map((deal) => (
                    <div
                        key={deal.id}
                        className="group relative border border-cyber-dim bg-cyber-dark/50 p-4 hover:border-cyber-green hover:border-glow transition-all duration-300"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-bold text-white group-hover:text-glow">{deal.brand}</h3>
                            <div className="text-xs text-cyber-dim border border-cyber-dim px-2 py-1">
                                ID_{deal.id.toString().padStart(4, '0')}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4 mb-4 text-sm">
                            <div className="text-cyber-green">
                                <span className="text-cyber-dim block text-xs">DISC</span>
                                {deal.discount_amount}%
                            </div>
                            <div className="text-cyber-green">
                                <span className="text-cyber-dim block text-xs">DUR</span>
                                {deal.duration_months}m
                            </div>
                            <div className="text-cyber-green ml-auto text-right">
                                <span className="text-cyber-dim block text-xs">V_SCORE</span>
                                <span className="text-xl font-bold group-hover:text-glow">{deal.value_score.toFixed(1)}</span>
                            </div>
                        </div>

                        {/* Summary */}
                        <p className="text-cyber-green/80 text-sm mb-4 line-clamp-3 font-light">
                            &gt; {deal.summary}
                        </p>

                        {/* Action */}
                        <button className="w-full border border-cyber-green text-cyber-green py-2 text-xs uppercase tracking-widest hover:bg-cyber-green hover:text-black transition-colors">
                            [ ACCESS_INTEL ]
                        </button>

                        {/* Corner Markers */}
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyber-dim group-hover:border-cyber-green"></div>
                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyber-dim group-hover:border-cyber-green"></div>
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyber-dim group-hover:border-cyber-green"></div>
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyber-dim group-hover:border-cyber-green"></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default IntelGrid;
