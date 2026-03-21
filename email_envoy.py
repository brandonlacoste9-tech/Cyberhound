"""
Email Envoy - Sends Imperial Intelligence & AdGenXai Pitches
Uses centralized config - NO hardcoded credentials
Attaches BOTH audit report and pitch deck for maximum impact
"""
import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path
from config import (
    SMTP_SERVER, SMTP_PORT, SMTP_USER, SMTP_PASS,
    DEFAULT_FROM_NAME, check_config
)

def deploy_envoy(target_email, target_name, target_data=None):
    """
    Send the complete Imperial package to a target
    Includes: Premium Ledger + AdGenXai Pitch Deck
    """
    
    if not check_config():
        return False
    
    print(f"🚀 120 OS: DEPLOYING FULL ENVOY TO {target_name.upper()}...")
    
    # Determine attachments based on target
    attachments = []
    
    # Always attach the Premium Ledger
    ledger_path = "IMPERIAL_PREMIUM_LEDGER.pdf"
    if os.path.exists(ledger_path):
        attachments.append((ledger_path, f"{target_name.replace(' ', '_')}_Compliance_Audit.pdf"))
    
    # Attach pitch deck if available
    safe_name = target_name.replace(' ', '_').replace('.', '').upper()
    pitch_path = f"PITCH_{safe_name}_AdGenXai.pdf"
    if os.path.exists(pitch_path):
        attachments.append((pitch_path, f"{target_name.replace(' ', '_')}_Growth_Proposal.pdf"))
    
    if not attachments:
        print(f"❌ No documents found for {target_name}")
        print("   Run: python3 build_ledger_premium.py")
        print("   And: python3 pitch_gen_adgenxai.py")
        return False
    
    # Create Message
    msg = MIMEMultipart()
    msg['From'] = f"{DEFAULT_FROM_NAME} <{SMTP_USER}>"
    msg['To'] = target_email
    msg['Subject'] = f"STRATEGIC ADVISORY: {target_name} - Compliance & Growth Assessment"

    # Enhanced body with dual-offer
    body = f"""Bonjour {target_name} Team,

Our market intelligence division has completed a comprehensive analysis of your firm's positioning in the Quebec market.

ATTACHED DOCUMENTS:

1. COMPLIANCE AUDIT (IMPERIAL_PREMIUM_LEDGER.pdf)
   - Current Bill 96 risk assessment: HIGH (7/10)
   - Regulatory exposure analysis
   - Immediate action items

2. GROWTH PROPOSAL (AdGenXai Pitch Deck)
   - $3,500/month autonomous AI solution
   - 100x creative speed vs traditional agencies
   - 90% cost reduction with superior ROI

THE BOTTOM LINE:
You are currently leaving 40% of the Quebec market untapped due to English-only positioning. We offer both the compliance fix AND the growth engine.

NEXT STEPS:
Reply to schedule a 15-minute Imperial Strategy Call, or call +1 (555) 467-3742.

Time is critical. The OQLF has increased enforcement activities.

Sincerement,
Bee
Northern Ventures Intelligence Division
"""
    msg.attach(MIMEText(body, 'plain'))

    # Attach all documents
    print(f"📎 Attaching {len(attachments)} documents...")
    for file_path, display_name in attachments:
        try:
            with open(file_path, "rb") as attachment:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(attachment.read())
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition", 
                    f"attachment; filename= {display_name}"
                )
                msg.attach(part)
                print(f"   ✓ Attached: {display_name}")
        except FileNotFoundError:
            print(f"   ⚠️  File not found: {file_path}")
            continue
    
    # Connect and send
    try:
        print(f"📧 Connecting to {SMTP_SERVER}...")
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ ENVOY DELIVERED: {target_name}")
        print(f"   Documents: {len(attachments)}")
        print(f"   Target: {target_email}")
        return True
        
    except Exception as e:
        print(f"⚠️  Envoy Interrupted: {e}")
        return False

def strike_stingray():
    """Pre-configured strike on Stingray Digital Group"""
    print("⚡ STRIKE PACKAGE: STINGRAY DIGITAL GROUP")
    print("="*60)
    
    # You'll need to find their actual contact email
    # Options: contact@stingray.com, info@stingraydigital.com, etc.
    target_email = "marketing@stingray.com"  # Primary: CMO/VP Marketing
    
    target_data = {
        "name": "Stingray Digital Group Inc",
        "risk_score": 7,
        "city": "Montreal"
    }
    
    return deploy_envoy(target_email, target_data["name"], target_data)

def strike_wm_group():
    """Pre-configured strike on WM Group Solutions"""
    print("⚡ STRIKE PACKAGE: WM GROUP SOLUTIONS")
    print("="*60)
    
    target_email = "info@wmgroupsolutions.com"  # Primary: Info/CEO contact
    
    target_data = {
        "name": "WM Group Solutions Inc",
        "risk_score": 7,
        "city": "Montreal"
    }
    
    return deploy_envoy(target_email, target_data["name"], target_data)

def main():
    """Main deployment interface"""
    print("⚡ 120 OS: EMAIL ENVOY - DUAL STRIKE MODE")
    print("="*60)
    print("\nReady to deploy:")
    print("  1. Imperial Premium Ledger (Compliance Audit)")
    print("  2. AdGenXai Pitch Deck (Growth Proposal)")
    print("\nTargets armed:")
    print("  • Stingray Digital Group Inc")
    print("  • WM Group Solutions Inc")
    
    print("\n" + "="*60)
    print("CONFIGURATION REQUIRED:")
    print("="*60)
    print("\n1. Update target email addresses in this script")
    print("2. Set credentials in .env file:")
    print("   export SMTP_USER='your_email@gmail.com'")
    print("   export SMTP_PASS='your_app_password'")
    print("\n3. Run strike:")
    print("   python3 -c \"from email_envoy import strike_stingray; strike_stingray()\"")
    
    # Check if we can test
    if check_config():
        print("\n✅ Credentials detected. Ready to fire.")
        print("\nExecute strike_stingray() or strike_wm_group()")
    else:
        print("\n⏳ Configure .env to activate.")

if __name__ == "__main__":
    main()
