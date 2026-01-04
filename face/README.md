# Face Module - Cyberpunk Dashboard

The Face module is a React-based dashboard with a Cyberpunk theme and live ticker.

## Features

- Cyberpunk-themed UI with Tailwind CSS
- Live deal ticker
- Real-time statistics dashboard
- Responsive grid layout
- Deal cards with ratings
- Animated components
- Custom fonts (Orbitron, Share Tech Mono)

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open http://localhost:3000

## Build

```bash
npm run build
```

## Design Elements

- **Colors**: Cyan (#00d9ff), Pink (#ff00ff), Purple (#9d00ff), Green (#00ff41)
- **Fonts**: Orbitron (headers), Share Tech Mono (monospace)
- **Theme**: Dark cyberpunk with glowing effects
- **Animations**: Pulse, glow, slide-up, ticker scroll

## Components

- `Header` - Main navigation with logo
- `Ticker` - Scrolling hot deals banner
- `Stats` - Statistics dashboard cards
- `DealGrid` - Grid of deal cards
- `DealCard` - Individual deal display

## Integration

The dashboard expects deal data in this format:

```javascript
{
  id: string,
  title: string,
  price: string,
  discount: string,
  discount_percent: number,
  rating: 'HOT' | 'GOOD' | 'FAIR' | 'COLD',
  score: number,
  source_url: string,
  link: string,
  scraped_at: string (ISO date)
}
```
