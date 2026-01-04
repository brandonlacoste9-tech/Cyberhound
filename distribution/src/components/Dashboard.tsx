import React from 'react';

// Mock Data for the Dashboard
const METRICS = {
    extraction_success: 94.2, // %
    intel_confidence: 88.5, // %
    ctr: 12.4, // %
    revenue: {
        burn: 4.50, // Cost of Vertex AI
        yield: 147.00 // Stripe + Affiliate
    },
    logs: [
        { time: "08:00:01", level: "INFO", msg: "Daily Scan Initiated. Targets: 20" },
        { time: "08:00:45", level: "SUCCESS", msg: "Shopify scan complete. Deal found." },
        { time: "08:00:48", level: "WARN", msg: "Adobe page structure changed. Using fallback." },
        { time: "08:01:12", level: "SUCCESS", msg: "Intel processed. V_SCORE: 92.5" },
        { time: "09:30:00", level: "REVENUE", msg: "Affiliate click detected (Shopify) - user_id: 882" },
    ]
};

const Dashboard: React.FC = () => {
    return (
        <div className="w-full max-w-7xl mx-auto p-4 border border-cyber-dim bg-cyber-black/90 relative">
            <h2 className="text-xl font-bold text-cyber-green mb-6 border-b border-cyber-dim pb-2 flex justify-between">
                <span>[ FOUNDER_MODE_ENABLED ]</span>
                <span className="text-sm font-normal text-cyber-dim">SYSTEM_INTEGRITY: 100%</span>
            </h2>

            {/* Top Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {/* Metric 1 */}
                <div className="border border-cyber-dim p-4">
                    <div className="text-xs text-cyber-dim uppercase">Extraction Rate</div>
                    <div className="text-2xl font-bold text-cyber-green">{METRICS.extraction_success}%</div>
                    <div className="w-full bg-cyber-dim h-1 mt-2">
                        <div className="bg-cyber-green h-1" style={{ width: `${METRICS.extraction_success}%` }}></div>
                    </div>
                </div>

                {/* Metric 2 */}
                <div className="border border-cyber-dim p-4">
                    <div className="text-xs text-cyber-dim uppercase">AI Confidence</div>
                    <div className="text-2xl font-bold text-cyber-green">{METRICS.intel_confidence}%</div>
                    <div className="w-full bg-cyber-dim h-1 mt-2">
                        <div className="bg-cyber-green h-1" style={{ width: `${METRICS.intel_confidence}%` }}></div>
                    </div>
                </div>

                {/* Metric 3 */}
                <div className="border border-cyber-dim p-4">
                    <div className="text-xs text-cyber-dim uppercase">Links Clicked (CTR)</div>
                    <div className="text-2xl font-bold text-cyber-green">{METRICS.ctr}%</div>
                    <div className="w-full bg-cyber-dim h-1 mt-2">
                        <div className="bg-cyber-green h-1" style={{ width: `${METRICS.ctr * 4}%` }}></div> {/* Scaled for visual */}
                    </div>
                </div>

                {/* Metric 4 (Profit) */}
                <div className="border border-cyber-green p-4 bg-cyber-green/10">
                    <div className="text-xs text-cyber-green uppercase">Net Yield (24h)</div>
                    <div className="text-2xl font-bold text-white">
                        ${(METRICS.revenue.yield - METRICS.revenue.burn).toFixed(2)}
                    </div>
                    <div className="text-xs text-cyber-dim mt-1">
                        Burn: ${METRICS.revenue.burn} | Gross: ${METRICS.revenue.yield}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* System Logs (Left 2/3) */}
                <div className="lg:col-span-2 border border-cyber-dim p-4">
                    <h3 className="text-sm font-bold text-cyber-green mb-4 border-b border-cyber-dim pb-1">[ SYSTEM LOGS ]</h3>
                    <div className="font-mono text-xs space-y-2 font-light">
                        {METRICS.logs.map((log, i) => (
                            <div key={i} className="flex gap-4">
                                <span className="text-cyber-dim">{log.time}</span>
                                <span className={`w-16 ${log.level === 'SUCCESS' ? 'text-cyber-green' :
                                        log.level === 'WARN' ? 'text-cyber-warning' :
                                            log.level === 'REVENUE' ? 'text-white font-bold' :
                                                'text-cyber-dim'
                                    }`}>[{log.level}]</span>
                                <span className="text-cyber-green/80 flex-1">{log.msg}</span>
                            </div>
                        ))}
                        <div className="animate-pulse text-cyber-green">_</div>
                    </div>
                </div>

                {/* Action Panel (Right 1/3) */}
                <div className="border border-cyber-dim p-4 flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-cyber-green mb-0 border-b border-cyber-dim pb-1">[ COMMANDS ]</h3>

                    <button className="text-left text-xs bg-cyber-dim/20 hover:bg-cyber-green hover:text-black p-2 transition-colors border border-cyber-dim">
                        EXECUTE 'FORCE SCAN'
                    </button>
                    <button className="text-left text-xs bg-cyber-dim/20 hover:bg-cyber-green hover:text-black p-2 transition-colors border border-cyber-dim">
                        REFRESH AFFILIATE MAP
                    </button>
                    <button className="text-left text-xs bg-cyber-dim/20 hover:bg-cyber-green hover:text-black p-2 transition-colors border border-cyber-dim">
                        GENERATE DAILY REPORT
                    </button>

                    <div className="mt-auto pt-4 border-t border-cyber-dim">
                        <div className="text-xs text-cyber-dim mb-2">SERVER_LOAD</div>
                        <div className="flex gap-1 h-8 items-end">
                            {[20, 45, 30, 60, 80, 50, 40, 30, 20, 10].map((h, i) => (
                                <div key={i} className="flex-1 bg-cyber-green/50 hover:bg-cyber-green" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
