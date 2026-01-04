# Brain Module - AI Deal Scoring

The Brain module evaluates and scores deals using AI (Vertex AI) and heuristic algorithms.

## Features

- Multi-factor deal scoring algorithm
- Vertex AI integration (optional)
- Heuristic fallback scoring
- Rating system (HOT, GOOD, FAIR, COLD)
- Configurable scoring weights
- Keyword-based quality detection

## Installation

```bash
pip install -r requirements.txt
```

## Usage

```python
from scorer import DealScorer

scorer = DealScorer(use_vertex_ai=False)
scored_deals = scorer.score_deals(deals)
scorer.save_scored_deals(scored_deals)
```

## Scoring Factors

1. **Discount Percentage** (40%) - Higher discounts score better
2. **Price Value** (30%) - Lower prices score better
3. **Freshness** (15%) - Recent deals score higher
4. **Keywords** (15%) - Presence of deal keywords

## Configuration

Set environment variables for Vertex AI:

```bash
export VERTEX_PROJECT_ID=your-project-id
export VERTEX_LOCATION=us-central1
```
