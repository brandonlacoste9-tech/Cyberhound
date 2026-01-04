import React from 'react';

function Ticker({ deals }) {
  const hotDeals = deals.filter(deal => deal.rating === 'HOT').slice(0, 5);
  
  if (hotDeals.length === 0) {
    return null;
  }

  return (
    <div className="bg-cyber-dark border-b border-cyber-blue/30 overflow-hidden">
      <div className="py-3">
        <div className="flex animate-ticker">
          {[...hotDeals, ...hotDeals, ...hotDeals].map((deal, index) => (
            <div
              key={`${deal.id}-${index}`}
              className="flex items-center gap-4 mx-8 whitespace-nowrap"
            >
              <span className="text-cyber-pink font-bold">🔥 HOT</span>
              <span className="text-cyber-blue font-mono">
                {deal.title}
              </span>
              <span className="text-cyber-green font-bold">
                {deal.discount}
              </span>
              <span className="text-cyber-blue/50">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Ticker;
