# 🌏 Cyberhound ↔ Korean SaaS Bridge

## Dual-Repository Architecture

### Repository Roles

| Repository | URL | Role | Remote Name |
|------------|-----|------|-------------|
| **Cyberhound** | github.com/brandonlacoste9-tech/Cyberhound | Intelligence & Sales | `origin` |
| **Korean-Basic-AI-Act** | github.com/brandonlacoste9-tech/Korean-basic-AI-act- | Product Platform | `korean-product` |

---

## The Bridge Workflow

### Phase 1: Intelligence (Cyberhound)

```bash
cd ~/IronClaw
python3 k_120_module/k_ghost_hound.py
# Output: K120_TARGETS_*.json with 10 Korean targets
```

### Phase 2: Sales Materials (Cyberhound)

```bash
python3 k_120_module/k_pitch_generator.py
# Output: K_AUDIT_*.pdf (₩1,000,000 proposal)
```

### Phase 3: Outreach (Cyberhound)

```bash
# Update email_envoy.py with Korean template
python3 email_envoy.py
# Sends audit + pitch to Toss Bank, Riiid, etc.
```

### Phase 4: Close (Cyberhound)

```bash
# When they reply:
python3 response_tracker.py
# Use closer_script_demo_call.md (Korean version)
```

### Phase 5: Onboard (Korean SaaS)

```bash
# Customer signs up at:
# https://korean-basic-ai-act.vercel.app (or similar)
# They use the /check compliance tool
```

---

## Revenue Flow

```
Cyberhound (Sales)
     ↓
K-Pitch (₩1,000,000 audit)
     ↓
Close Deal (₩5,000,000/mo retainer)
     ↓
Customer Uses → Korean SaaS Platform
     ↓
Monthly Recurring Revenue
```

---

## Sync Strategy

### Keep K-120 in Cyberhound (Current)
- K-Ghost Hound (targeting)
- K-PIPA Engine (analysis)
- K-Pitch Generator (sales docs)

### Pull Korean SaaS as needed
```bash
# Clone for development
git clone git@github.com:brandonlacoste9-tech/Korean-basic-AI-act-.git korean_product
cd korean_product
npm install  # or pip install
npm run dev  # Start the platform
```

### Never merge the repos
- Cyberhound = Secret sauce (intelligence)
- Korean SaaS = Customer-facing product

---

## Quick Commands

```bash
# Check all remotes
git remote -v

# Push K-120 updates to Cyberhound
git push origin main

# Pull Korean product updates
git fetch korean-product

# Deploy Korean SaaS
cd ../korean_product  # Separate clone
git pull origin main
vercel deploy  # or your deployment method
```

---

## Target Handoff

When K-Ghost Hound finds a target:

1. **Cyberhound** generates the audit
2. **Email** sends the proposal
3. **Call** closes the deal
4. **Korean SaaS** delivers the product

**The customer never sees Cyberhound. They only see the polished Korean SaaS platform.**

This is the true Sovereign Architecture. 🐺⚡🇰🇷
