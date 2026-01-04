# Cyberhound Project Plan

## Mission

Automated deal extraction, intelligence processing, and high-speed distribution dashboard.

## Architecture

### 1. The Nose (Extraction Layer)

- **Tech**: Python, Playwright.
- **Task**: Monitor sources, detect changes, extract raw HTML/Text.
- **Status**: Skeleton `trigger.py` created.

### 2. The Brain (Intelligence Layer)

- **Tech**: Gemini API (via Colony OS or direct).
- **Task**: Parse raw text into structured JSON `(Type, Discount, Duration, ValueScore)`.
- **Status**: Pending.

### 3. The Blast (Distribution Layer)

- **Tech**: React (Vite) + Node/Python Backend.
- **UI**: Terminal-inspired, dark mode, monospaced ticker.
- **Status**: Client scaffolded.

### 4. The Funding (Revenue Layer)

- **Task**: Lead generation, tiered access.

## Current Progress

- [x] Project Structure Created
- [x] Database Schema (`deals.db`) initialized
- [x] Extraction Trigger (`trigger.py`) created
- [ ] Frontend Ticker UI Implementation
- [ ] Integration connecting Trigger -> DB -> UI
