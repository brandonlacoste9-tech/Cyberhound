"""
K-120 Module: Korean AI Compliance Intelligence API
Part of the Cyberhound Intelligence Layer
"""

from .k_ghost_hound import KGhostHound
from .k_pipa_engine import KPIPAModel
from .k_pitch_generator import generate_k_audit_report
from .k_email_envoy import send_k_strike, batch_k_strike

__version__ = "1.0.0"
__all__ = [
    "KGhostHound",
    "KPIPAModel", 
    "generate_k_audit_report",
    "send_k_strike",
    "batch_k_strike"
]
