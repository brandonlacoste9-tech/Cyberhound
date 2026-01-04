import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Ticker from './components/Ticker';
import DealGrid from './components/DealGrid';
import Stats from './components/Stats';

function App() {
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState({
    totalDeals: 0,
    hotDeals: 0,
    totalSavings: 0,
    clicks: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch deals (mock data for now)
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockDeals = [
        {
          id: '1',
          title: 'Premium Cloud Storage - Lifetime Access',
          price: 'Free',
          discount: '100% OFF',
          discount_percent: 100,
          rating: 'HOT',
          score: 95,
          source_url: 'https://example.com',
          link: '/track/1',
          scraped_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Gaming Bundle - 10 AAA Titles',
          price: '$19.99',
          discount: '75% OFF',
          discount_percent: 75,
          rating: 'HOT',
          score: 88,
          source_url: 'https://example.com',
          link: '/track/2',
          scraped_at: new Date().toISOString()
        },
        {
          id: '3',
          title: 'VPN Service - 2 Year Plan',
          price: '$59.99',
          discount: '50% OFF',
          discount_percent: 50,
          rating: 'GOOD',
          score: 72,
          source_url: 'https://example.com',
          link: '/track/3',
          scraped_at: new Date().toISOString()
        },
        {
          id: '4',
          title: 'Online Course Bundle',
          price: '$29.99',
          discount: '60% OFF',
          discount_percent: 60,
          rating: 'GOOD',
          score: 68,
          source_url: 'https://example.com',
          link: '/track/4',
          scraped_at: new Date().toISOString()
        },
        {
          id: '5',
          title: 'Productivity Software Suite',
          price: '$39.99',
          discount: '40% OFF',
          discount_percent: 40,
          rating: 'FAIR',
          score: 55,
          source_url: 'https://example.com',
          link: '/track/5',
          scraped_at: new Date().toISOString()
        }
      ];

      setDeals(mockDeals);
      setStats({
        totalDeals: mockDeals.length,
        hotDeals: mockDeals.filter(d => d.rating === 'HOT').length,
        totalSavings: mockDeals.reduce((sum, d) => sum + d.discount_percent, 0),
        clicks: 127
      });
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen cyber-grid">
      <Header />
      <Ticker deals={deals} />
      
      <main className="container mx-auto px-4 py-8">
        <Stats stats={stats} />
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-2xl text-cyber-blue animate-pulse">
              SCANNING FOR DEALS...
            </div>
          </div>
        ) : (
          <DealGrid deals={deals} />
        )}
      </main>
      
      <footer className="border-t border-cyber-blue/30 mt-16 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-cyber-blue/70 font-mono text-sm">
            CYBERHOUND v1.0 // AUTONOMOUS DEAL INTELLIGENCE SYSTEM
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
