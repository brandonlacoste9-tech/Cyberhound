# ⚜️ IronClaw - 120 OS

**Souverain Venture Intelligence System**

> *"The Bee Swarm Empire doesn't ask for market share—it takes it."*

## 🎯 Overview

IronClaw is an autonomous business intelligence and outreach system designed to identify, analyze, and engage high-value enterprise targets. Originally forged for the Quebec market (Bill 96 compliance), the architecture scales to any sector requiring precision branding and regulatory navigation.

## 🏛️ Empire Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    120 OS - SYSTEM MAP                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   THE HUNT   │ →  │  THE FORGE   │ →  │  THE ENVOY   │  │
│  │              │    │              │    │              │  │
│  │ scout_na_    │    │ build_ledger │    │ email_envoy  │  │
│  │ final.py     │    │ _premium.py  │    │ .py          │  │
│  │              │    │              │    │              │  │
│  │ 27 Leads     │    │ PDF Asset    │    │ SMTP Delivery│  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘  │
│         ↑                                        │          │
│         └────────────────────────────────────────┘          │
│                     ┌──────────────┐                        │
│                     │ THE WATCHDOG │                        │
│                     │              │                        │
│                     │ response_    │                        │
│                     │ tracker.py   │                        │
│                     │              │                        │
│                     │ IMAP Monitor │                        │
│                     └──────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Credentials

```bash
cp .env.example .env
nano .env  # Edit with your Gmail credentials
```

### 3. Run the Ghost Hound

```bash
python3 scout_na_final.py
```

### 4. Forge the Ledger

```bash
python3 build_ledger_premium.py
```

### 5. Deploy the Envoy

```bash
python3 email_envoy.py
```

### 6. Activate the Watchdog

```bash
python3 response_tracker.py
```

## 📁 Directory Structure

```
IronClaw/
├── scout_na_final.py          # Primary reconnaissance script
├── build_ledger_premium.py    # PDF report generator
├── email_envoy.py             # SMTP outreach system
├── response_tracker.py        # IMAP reply monitor
├── config.py                  # Centralized configuration
├── .env.example               # Credential template
├── .gitignore                 # Security exclusions
├── requirements.txt           # Python dependencies
├── README.md                  # This file
│
├── BUTIN_CONTINENTAL_MASTER.json  # Primary intelligence database
├── IMPERIAL_PREMIUM_LEDGER.pdf    # Executive deliverable
└── Empire_Comms.log               # Communication history
```

## 🔒 Security

**CRITICAL:** Never commit credentials or proprietary data.

The `.gitignore` file excludes:
- All credential files (`*.json` secrets, `.env`)
- Generated intelligence (`BUTIN_*.json`)
- Executive documents (`*.pdf`)
- Communication logs (`Empire_Comms.log`)

## 🎨 The Imperial Aesthetic

All deliverables follow the **Souverain** design language:
- **Primary:** Dark leather (#1A1A1A)
- **Accent:** Imperial gold (#D4AF37)
- **Typography:** Helvetica (clean, authoritative)
- **Tone:** Bilingual (French/English), regulatory-focused

## 📊 Performance

| Metric | Value |
|--------|-------|
| **Cities Analyzed** | 4 (Montreal, Toronto, Vancouver, Calgary) |
| **Leads Captured** | 27 |
| **Empire Targets** | 2 (High-priority) |
| **Memory Usage** | <1.5GB (heuristic mode) |
| **Cost** | $0.00 (fully sovereign) |

## 🛡️ Operational Notes

### What Works
- ✅ Canadian Yellow Pages scraping
- ✅ Heuristic risk analysis (no LLM required)
- ✅ PDF generation with Imperial styling
- ✅ SMTP email deployment
- ✅ IMAP reply monitoring

### Known Limitations
- ⚠️ USA Yellow Pages blocks all requests (403)
- ⚠️ Local LLM requires 4GB+ RAM (cloud alternative available)

## 📜 License

**Proprietary - Northern Ventures**

Unauthorized distribution of generated intelligence or targeting algorithms is strictly prohibited.

---

*Forge the Empire. Secure the Sovereign.* ⚜️
