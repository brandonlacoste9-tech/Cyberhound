# Proxy Module - Affiliate Click Tracker

The Proxy module tracks clicks on affiliate links and handles redirections.

## Features

- Click tracking and analytics
- Affiliate link management
- Multiple affiliate program support
- Real-time statistics API
- RESTful API for integration
- In-memory storage (database-ready)

## Installation

```bash
npm install
```

## Usage

Start the server:

```bash
npm start
```

Development mode with auto-reload:

```bash
npm run dev
```

## API Endpoints

### Track Click
```
GET /track/:dealId?target=URL&program=PROGRAM
```
Redirects to affiliate link and records the click.

### Register Affiliate Link
```
POST /api/affiliate/register
Body: { dealId, originalUrl, affiliateUrl, program }
```
Returns a tracking URL for the deal.

### Get Statistics
```
GET /api/stats?dealId=ID&program=PROGRAM&since=DATE
```
Returns click statistics and analytics.

### Get Clicks
```
GET /api/clicks?limit=100&offset=0
```
Returns paginated click data.

### Health Check
```
GET /health
```
Returns server health status.

## Configuration

Set environment variables:

```bash
PROXY_PORT=3001
AMAZON_AFFILIATE_ID=your-amazon-id
EBAY_AFFILIATE_ID=your-ebay-id
```

## Example Usage

```javascript
// Track a click
fetch('http://localhost:3001/track/deal123?target=https://example.com&program=amazon')

// Get statistics
fetch('http://localhost:3001/api/stats')
  .then(res => res.json())
  .then(stats => console.log(stats))
```
