import React from 'react';
import DealCard from './DealCard';

function DealGrid({ deals }) {
  if (deals.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🐺</div>
        <p className="text-cyber-blue/50 font-mono">
          NO DEALS DETECTED. INITIATE SCAN...
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-cyber-blue mb-6 font-orbitron">
        DETECTED DEALS
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {deals.map((deal, index) => (
          <DealCard key={deal.id} deal={deal} index={index} />
        ))}
      </div>
    </div>
  );
}

export default DealGrid;
