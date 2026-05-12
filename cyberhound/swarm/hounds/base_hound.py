"""
Base Hound Class - Abstract base for all Cyberhound agents
Every hound in the swarm inherits from this base class.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional
from datetime import datetime


class BaseHound(ABC):
    """
    Abstract base class for all Cyberhound agents.
    
    Each hound is a specialized hunter for a specific platform or opportunity type.
    """
    
    def __init__(self, name: str, category: str, config: Dict = None):
        self.name = name
        self.category = category
        self.config = config or {}
        
        # State tracking
        self.status = "IDLE"  # IDLE, HUNTING, RESTING, ERROR
        self.bounties_found = 0
        self.last_hunt = None
        self.errors = []
    
    @abstractmethod
    async def hunt(self, filters: Optional[Dict] = None) -> List[Dict]:
        """
        Execute the hunt. Must be implemented by each hound.
        
        Args:
            filters: Optional filters to narrow the search
            
        Returns:
            List of opportunity dictionaries
        """
        pass
    
    def get_stats(self) -> Dict:
        """Get hound statistics"""
        return {
            'name': self.name,
            'category': self.category,
            'status': self.status,
            'bounties_found': self.bounties_found,
            'last_hunt': self.last_hunt.isoformat() if self.last_hunt else None
        }
    
    def to_dict(self) -> Dict:
        """Serialize hound to dictionary"""
        return {
            'name': self.name,
            'category': self.category,
            'status': self.status,
            'bounties_found': self.bounties_found
        }
