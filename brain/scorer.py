"""
Brain Module - AI-powered deal scoring using Vertex AI
Evaluates and scores deals based on multiple factors
"""

import json
import os
from typing import List, Dict, Optional
from datetime import datetime


class DealScorer:
    """Scores and ranks deals using AI and heuristics"""
    
    def __init__(self, use_vertex_ai: bool = False):
        self.use_vertex_ai = use_vertex_ai
        self.weights = {
            'discount_percent': 0.4,
            'price_value': 0.3,
            'freshness': 0.15,
            'keyword_match': 0.15
        }
        
        # Keywords that indicate good deals
        self.hot_keywords = [
            'free', 'trial', 'limited', 'exclusive', 'premium',
            'lifetime', 'bundle', 'sale', 'clearance', 'promo'
        ]
        
        if use_vertex_ai:
            self._init_vertex_ai()
    
    def _init_vertex_ai(self):
        """Initialize Vertex AI client"""
        try:
            from google.cloud import aiplatform
            
            project_id = os.getenv('VERTEX_PROJECT_ID', 'your-project-id')
            location = os.getenv('VERTEX_LOCATION', 'us-central1')
            
            aiplatform.init(project=project_id, location=location)
            print("Vertex AI initialized successfully")
            self.vertex_available = True
        except Exception as e:
            print(f"Vertex AI initialization failed: {str(e)}")
            print("Falling back to heuristic scoring")
            self.vertex_available = False
            self.use_vertex_ai = False
    
    def score_deal(self, deal: Dict) -> Dict:
        """
        Score a single deal
        
        Args:
            deal: Deal dictionary with title, price, discount, etc.
            
        Returns:
            Deal dictionary with added 'score' and 'rating' fields
        """
        if self.use_vertex_ai and self.vertex_available:
            return self._score_with_vertex_ai(deal)
        else:
            return self._score_with_heuristics(deal)
    
    def _score_with_heuristics(self, deal: Dict) -> Dict:
        """Score deal using rule-based heuristics"""
        score = 0.0
        
        # 1. Discount percentage score (0-100)
        discount_score = min(deal.get('discount_percent', 0), 100)
        score += discount_score * self.weights['discount_percent']
        
        # 2. Price value score (inverse - lower is better)
        price_text = deal.get('price', 'N/A')
        price_score = self._extract_price_score(price_text)
        score += price_score * self.weights['price_value']
        
        # 3. Freshness score (recent deals get higher scores)
        freshness_score = self._calculate_freshness(deal.get('scraped_at'))
        score += freshness_score * self.weights['freshness']
        
        # 4. Keyword match score
        keyword_score = self._calculate_keyword_score(deal.get('title', ''))
        score += keyword_score * self.weights['keyword_match']
        
        # Add score to deal
        deal['score'] = round(score, 2)
        deal['rating'] = self._get_rating(score)
        deal['scoring_method'] = 'heuristic'
        
        return deal
    
    def _score_with_vertex_ai(self, deal: Dict) -> Dict:
        """
        Score deal using Vertex AI
        
        This is a placeholder for actual Vertex AI integration.
        In production, this would call Vertex AI's prediction API.
        """
        try:
            # Prepare prompt for AI scoring
            prompt = self._create_scoring_prompt(deal)
            
            # In production, call Vertex AI here
            # For now, fall back to heuristics
            print("Vertex AI scoring would be called here")
            return self._score_with_heuristics(deal)
            
        except Exception as e:
            print(f"Vertex AI scoring error: {str(e)}")
            return self._score_with_heuristics(deal)
    
    def _create_scoring_prompt(self, deal: Dict) -> str:
        """Create prompt for AI scoring"""
        return f"""
        Score this deal on a scale of 0-100:
        Title: {deal.get('title', 'Unknown')}
        Price: {deal.get('price', 'N/A')}
        Discount: {deal.get('discount', 'N/A')}
        
        Consider factors like:
        - Discount percentage
        - Product value
        - Deal popularity
        - Urgency indicators
        
        Return only a numerical score.
        """
    
    def _extract_price_score(self, price_text: str) -> float:
        """Extract and score price (lower prices get higher scores)"""
        import re
        
        # Try to extract numeric value
        match = re.search(r'[\$£€]?\s*(\d+(?:\.\d+)?)', price_text)
        if match:
            price = float(match.group(1))
            # Score: 100 for free, decreasing as price increases
            if price == 0:
                return 100
            elif price < 10:
                return 90
            elif price < 50:
                return 70
            elif price < 100:
                return 50
            else:
                return 30
        return 50  # Default score if price can't be extracted
    
    def _calculate_freshness(self, scraped_at: Optional[str]) -> float:
        """Calculate freshness score based on scrape time"""
        if not scraped_at:
            return 50  # Default score
        
        try:
            scraped_time = datetime.fromisoformat(scraped_at.replace('Z', '+00:00'))
            age_hours = (datetime.utcnow() - scraped_time.replace(tzinfo=None)).total_seconds() / 3600
            
            if age_hours < 1:
                return 100
            elif age_hours < 6:
                return 90
            elif age_hours < 24:
                return 70
            else:
                return 50
        except:
            return 50
    
    def _calculate_keyword_score(self, title: str) -> float:
        """Calculate score based on hot keywords in title"""
        if not title:
            return 0
        
        title_lower = title.lower()
        matches = sum(1 for keyword in self.hot_keywords if keyword in title_lower)
        
        # Score: 0-100 based on keyword matches
        return min(matches * 25, 100)
    
    def _get_rating(self, score: float) -> str:
        """Convert numerical score to rating"""
        if score >= 80:
            return 'HOT'
        elif score >= 60:
            return 'GOOD'
        elif score >= 40:
            return 'FAIR'
        else:
            return 'COLD'
    
    def score_deals(self, deals: List[Dict]) -> List[Dict]:
        """
        Score multiple deals and sort by score
        
        Args:
            deals: List of deal dictionaries
            
        Returns:
            Sorted list of scored deals
        """
        scored_deals = []
        
        for deal in deals:
            scored_deal = self.score_deal(deal)
            scored_deals.append(scored_deal)
        
        # Sort by score (highest first)
        scored_deals.sort(key=lambda x: x.get('score', 0), reverse=True)
        
        return scored_deals
    
    def save_scored_deals(self, deals: List[Dict], filepath: str = 'scored_deals.json'):
        """Save scored deals to JSON file"""
        with open(filepath, 'w') as f:
            json.dump(deals, f, indent=2)
        print(f"Saved {len(deals)} scored deals to {filepath}")


def main():
    """Example usage of DealScorer"""
    # Load deals from file (assuming scraped by Nose module)
    try:
        with open('../nose/deals.json', 'r') as f:
            deals = json.load(f)
    except FileNotFoundError:
        print("No deals found. Run the Nose module first.")
        # Example deals for testing
        deals = [
            {
                'title': 'Premium Software - Free Trial',
                'price': '$0.00',
                'discount': '100% off',
                'discount_percent': 100,
                'scraped_at': datetime.utcnow().isoformat()
            },
            {
                'title': 'Gaming Bundle - 50% Off',
                'price': '$29.99',
                'discount': '50% off',
                'discount_percent': 50,
                'scraped_at': datetime.utcnow().isoformat()
            }
        ]
    
    # Score deals
    scorer = DealScorer(use_vertex_ai=False)
    scored_deals = scorer.score_deals(deals)
    
    print(f"\nScored {len(scored_deals)} deals:")
    for deal in scored_deals[:5]:  # Show top 5
        print(f"  [{deal['rating']}] {deal['title']} - Score: {deal['score']}")
    
    scorer.save_scored_deals(scored_deals)


if __name__ == '__main__':
    main()
