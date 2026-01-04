import React from 'react';

function DealCard({ deal, index }) {
  const ratingColors = {
    HOT: 'border-cyber-pink text-cyber-pink',
    GOOD: 'border-cyber-blue text-cyber-blue',
    FAIR: 'border-cyber-green text-cyber-green',
    COLD: 'border-cyber-blue/30 text-cyber-blue/30',
  };

  const ratingIcons = {
    HOT: '🔥',
    GOOD: '⭐',
    FAIR: '✓',
    COLD: '❄️',
  };

  return (
    <div
      className={`bg-cyber-darker border ${ratingColors[deal.rating]} p-6 hover:scale-105 transition-all duration-300 animate-slide-up cursor-pointer group`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Rating Badge */}
      <div className="flex items-center justify-between mb-4">
        <span className={`px-3 py-1 border ${ratingColors[deal.rating]} text-sm font-mono font-bold`}>
          {ratingIcons[deal.rating]} {deal.rating}
        </span>
        <span className="text-cyber-blue/50 font-mono text-sm">
          SCORE: {deal.score}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-cyber-blue mb-3 line-clamp-2 group-hover:text-glow transition-all">
        {deal.title}
      </h3>

      {/* Price & Discount */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl font-bold text-cyber-green">
          {deal.price}
        </span>
        <span className="text-cyber-pink font-bold text-xl">
          {deal.discount}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-cyber-dark border border-cyber-blue/30">
          <div
            className="h-full bg-gradient-to-r from-cyber-blue to-cyber-pink transition-all duration-500"
            style={{ width: `${deal.discount_percent}%` }}
          />
        </div>
      </div>

      {/* Action Button */}
      <button className="w-full py-2 border border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-cyber-darker transition-all duration-300 font-mono font-bold">
        CLAIM DEAL
      </button>

      {/* Timestamp */}
      <div className="mt-3 text-cyber-blue/30 font-mono text-xs text-center">
        DETECTED: {new Date(deal.scraped_at).toLocaleTimeString()}
      </div>
    </div>
  );
}

export default DealCard;
