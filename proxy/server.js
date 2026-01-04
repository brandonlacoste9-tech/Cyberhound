/**
 * Proxy Module - Affiliate Click Tracker
 * Tracks clicks on affiliate links and redirects users
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PROXY_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage for clicks (use database in production)
const clickData = [];
const affiliateLinks = new Map();

// Initialize with some example affiliate programs
affiliateLinks.set('amazon', {
  baseUrl: 'https://amazon.com',
  affiliateId: process.env.AMAZON_AFFILIATE_ID || 'cyberhound-20',
  tag: 'tag'
});

affiliateLinks.set('ebay', {
  baseUrl: 'https://ebay.com',
  affiliateId: process.env.EBAY_AFFILIATE_ID || 'cyberhound-ebay',
  tag: 'campid'
});

/**
 * Track a click and redirect to affiliate link
 */
app.get('/track/:dealId', (req, res) => {
  const { dealId } = req.params;
  const { target, program } = req.query;
  
  if (!target) {
    return res.status(400).json({ error: 'Target URL is required' });
  }
  
  // Generate unique click ID
  const clickId = uuidv4();
  
  // Record click data
  const clickRecord = {
    clickId,
    dealId,
    program: program || 'unknown',
    targetUrl: target,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    referrer: req.headers.referer || 'direct'
  };
  
  clickData.push(clickRecord);
  
  // Build affiliate URL
  let redirectUrl = target;
  
  if (program && affiliateLinks.has(program)) {
    const affiliate = affiliateLinks.get(program);
    redirectUrl = appendAffiliateParams(target, affiliate);
  }
  
  console.log(`[CLICK] Deal: ${dealId}, Click: ${clickId}, Target: ${redirectUrl}`);
  
  // Redirect to affiliate link
  res.redirect(302, redirectUrl);
});

/**
 * Register a new affiliate link
 */
app.post('/api/affiliate/register', (req, res) => {
  const { dealId, originalUrl, affiliateUrl, program } = req.body;
  
  if (!dealId || !affiliateUrl) {
    return res.status(400).json({ error: 'dealId and affiliateUrl are required' });
  }
  
  const trackingUrl = `${req.protocol}://${req.get('host')}/track/${dealId}?target=${encodeURIComponent(affiliateUrl)}&program=${program || 'custom'}`;
  
  res.json({
    success: true,
    dealId,
    trackingUrl,
    originalUrl,
    affiliateUrl
  });
});

/**
 * Get click statistics
 */
app.get('/api/stats', (req, res) => {
  const { dealId, program, since } = req.query;
  
  let filteredClicks = [...clickData];
  
  if (dealId) {
    filteredClicks = filteredClicks.filter(click => click.dealId === dealId);
  }
  
  if (program) {
    filteredClicks = filteredClicks.filter(click => click.program === program);
  }
  
  if (since) {
    const sinceDate = new Date(since);
    filteredClicks = filteredClicks.filter(click => new Date(click.timestamp) >= sinceDate);
  }
  
  // Calculate statistics
  const stats = {
    totalClicks: filteredClicks.length,
    uniqueDeals: new Set(filteredClicks.map(c => c.dealId)).size,
    byProgram: {},
    recent: filteredClicks.slice(-10).reverse()
  };
  
  // Group by program
  filteredClicks.forEach(click => {
    if (!stats.byProgram[click.program]) {
      stats.byProgram[click.program] = 0;
    }
    stats.byProgram[click.program]++;
  });
  
  res.json(stats);
});

/**
 * Get all tracked clicks
 */
app.get('/api/clicks', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  
  const paginatedClicks = clickData.slice(offset, offset + limit);
  
  res.json({
    total: clickData.length,
    limit,
    offset,
    clicks: paginatedClicks
  });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    totalClicks: clickData.length
  });
});

/**
 * Append affiliate parameters to URL
 */
function appendAffiliateParams(url, affiliate) {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set(affiliate.tag, affiliate.affiliateId);
    return urlObj.toString();
  } catch (error) {
    console.error('Error appending affiliate params:', error);
    return url;
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`🐺 Cyberhound Proxy running on port ${PORT}`);
  console.log(`   Track clicks: http://localhost:${PORT}/track/:dealId?target=URL`);
  console.log(`   View stats: http://localhost:${PORT}/api/stats`);
});

module.exports = app;
