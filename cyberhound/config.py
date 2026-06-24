"""
Empire Configuration - Centralized settings
Load credentials from environment variables
"""
import os
from dotenv import load_dotenv

# Load .env file if present
load_dotenv()

# SMTP Configuration
SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
SMTP_USER = os.getenv('SMTP_USER', '')
SMTP_PASS = os.getenv('SMTP_PASS', '')

# IMAP Configuration (for watchdog)
IMAP_SERVER = os.getenv('IMAP_SERVER', 'imap.gmail.com')
IMAP_USER = os.getenv('GMAIL_USER', SMTP_USER)  # Fallback to SMTP user
IMAP_PASS = os.getenv('GMAIL_PASS', SMTP_PASS)  # Fallback to SMTP pass

# Empire Settings
EMPIRE_NAME = "Northern Ventures"
DEFAULT_FROM_NAME = "Northern Ventures Intelligence Division"
LEDGER_PATH = "IMPERIAL_PREMIUM_LEDGER.pdf"

# Target Tracking
TRACKED_DOMAINS = [
    'stingray.com',
    'stingraydigital.com',
    'wmgroup.com',
    'wmgroupsolutions.com'
]

# ── Hermes AI Configuration ─────────────────────────────────────
HERMES_BASE_URL = os.getenv('HERMES_BASE_URL', 'https://api.deepseek.com/v1')
HERMES_API_KEY = os.getenv('HERMES_API_KEY') or os.getenv('DEEPSEEK_API_KEY', '')
HERMES_MODEL = os.getenv('HERMES_MODEL', 'deepseek-chat')
HERMES_MAX_MODEL = os.getenv('HERMES_MAX_MODEL', 'deepseek-reasoner')

AI_EMAIL_ENABLED = os.getenv('AI_EMAIL_ENABLED', 'true').lower() == 'true'
AI_ENRICH_ENABLED = os.getenv('AI_ENRICH_ENABLED', 'true').lower() == 'true'
AI_WATCHDOG_ENABLED = os.getenv('AI_WATCHDOG_ENABLED', 'true').lower() == 'true'

# Autonomous mode: disable HITL approvals, auto everything possible
AUTONOMOUS_MODE = os.getenv('AUTONOMOUS_MODE', 'false').lower() == 'true'

def check_config():
    """Verify all required credentials are set"""
    missing = []
    if not SMTP_USER:
        missing.append('SMTP_USER')
    if not SMTP_PASS:
        missing.append('SMTP_PASS')
    
    if missing:
        print("⚠️  Missing environment variables:")
        for var in missing:
            print(f"   - {var}")
        print("\nSet them in your .env file or environment:")
        print("  export SMTP_USER='your_email@gmail.com'")
        print("  export SMTP_PASS='your_app_password'")
        return False
    return True
