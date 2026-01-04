import React from 'react';

function Stats({ stats }) {
  const statItems = [
    { label: 'TOTAL DEALS', value: stats.totalDeals, color: 'text-cyber-blue', icon: '📊' },
    { label: 'HOT DEALS', value: stats.hotDeals, color: 'text-cyber-pink', icon: '🔥' },
    { label: 'AVG SAVINGS', value: `${Math.round(stats.totalSavings / (stats.totalDeals || 1))}%`, color: 'text-cyber-green', icon: '💰' },
    { label: 'CLICKS', value: stats.clicks, color: 'text-cyber-purple', icon: '👆' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      {statItems.map((stat, index) => (
        <div
          key={stat.label}
          className="bg-cyber-darker border border-cyber-blue/30 p-6 hover:border-cyber-blue transition-all duration-300 animate-slide-up"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">{stat.icon}</span>
            <span className={`text-3xl font-bold ${stat.color} text-glow`}>
              {stat.value}
            </span>
          </div>
          <div className="text-cyber-blue/70 font-mono text-sm">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Stats;
