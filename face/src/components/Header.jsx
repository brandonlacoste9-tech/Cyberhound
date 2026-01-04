import React from 'react';

function Header() {
  return (
    <header className="border-b-2 border-cyber-blue bg-cyber-darker/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🐺</div>
            <div>
              <h1 className="text-4xl font-bold text-cyber-blue text-glow font-orbitron">
                CYBERHOUND
              </h1>
              <p className="text-sm text-cyber-green font-mono">
                Autonomous Deal Intelligence v1.0
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button className="px-4 py-2 border border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-cyber-darker transition-all duration-300 font-mono">
              SCAN
            </button>
            <button className="px-4 py-2 border border-cyber-pink text-cyber-pink hover:bg-cyber-pink hover:text-cyber-darker transition-all duration-300 font-mono">
              FILTER
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
