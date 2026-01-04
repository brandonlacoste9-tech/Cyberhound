# 🐺 Cyberhound

**Autonomous Deal Intelligence Agent**

Cyberhound is an intelligent system that hunts for the best deals across the internet, scores them using AI, tracks affiliate clicks, and presents everything through a stunning Cyberpunk-themed dashboard.

## Architecture

Cyberhound consists of 4 specialized modules:

### 1. 👃 Nose (Python/Playwright)
The web scraper that sniffs out deals across multiple websites.
- Asynchronous scraping with Playwright
- Configurable site selectors
- Concurrent multi-site scanning
- Deal validation and filtering

### 2. 🧠 Brain (Vertex AI)
AI-powered deal scoring and intelligence.
- Multi-factor deal scoring algorithm
- Vertex AI integration (optional)
- Heuristic fallback scoring
- Rating system (HOT, GOOD, FAIR, COLD)

### 3. 🔗 Proxy (Node.js)
Affiliate click tracking and management.
- RESTful API for click tracking
- Multiple affiliate program support
- Real-time analytics
- Click-through redirects

### 4. 😎 Face (React/Tailwind)
Cyberpunk-themed dashboard with live ticker.
- Real-time deal display
- Live scrolling ticker for hot deals
- Statistics dashboard
- Responsive design with glowing effects

### 5. 🏭 Fabricator
Script to clone Cyberhound into niche-specific instances.
- Pre-configured niche templates
- Automatic setup and configuration
- Support for tech, gaming, learning, shopping niches

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Setup

#### 1. Nose Module (Scraper)
```bash
cd nose
pip install -r requirements.txt
python -m playwright install chromium
python scraper.py
```

#### 2. Brain Module (Scorer)
```bash
cd brain
pip install -r requirements.txt
python scorer.py
```

#### 3. Proxy Module (Tracker)
```bash
cd proxy
npm install
npm start
```

#### 4. Face Module (Dashboard)
```bash
cd face
npm install
npm run dev
```
Open http://localhost:3000

### Create a Niche Instance

```bash
cd fabricator
python fabricator.py list                    # List available niches
python fabricator.py tech ../TechHound       # Create TechHound
python fabricator.py gaming ../GameHound     # Create GameHound
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Vertex AI (optional)
VERTEX_PROJECT_ID=your-project-id
VERTEX_LOCATION=us-central1

# Proxy Server
PROXY_PORT=3001
AMAZON_AFFILIATE_ID=your-amazon-id
EBAY_AFFILIATE_ID=your-ebay-id

# Dashboard
VITE_API_URL=http://localhost:3001
```

## Module Documentation

- [Nose - Web Scraper](nose/README.md)
- [Brain - AI Scorer](brain/README.md)
- [Proxy - Click Tracker](proxy/README.md)
- [Face - Dashboard](face/README.md)
- [Fabricator - Niche Generator](fabricator/README.md)

## Workflow

1. **Nose** scrapes websites for deals → outputs `deals.json`
2. **Brain** scores the deals → outputs `scored_deals.json`
3. **Proxy** tracks clicks when users click deals
4. **Face** displays deals in real-time dashboard
5. **Fabricator** creates customized versions for specific niches

## Features

✅ Automated deal discovery  
✅ AI-powered deal scoring  
✅ Affiliate click tracking  
✅ Real-time dashboard  
✅ Cyberpunk-themed UI  
✅ Live deal ticker  
✅ Multi-niche support  
✅ Configurable scraping targets  
✅ RESTful APIs  
✅ Responsive design  

## Tech Stack

- **Backend**: Python (Playwright), Node.js (Express)
- **Frontend**: React, Tailwind CSS, Vite
- **AI**: Vertex AI (optional)
- **Styling**: Custom Cyberpunk theme
- **Fonts**: Orbitron, Share Tech Mono

## License

MIT

## Contributing

Contributions welcome! Please read the contributing guidelines before submitting PRs.

---

Built with 🐺 by the Cyberhound team
