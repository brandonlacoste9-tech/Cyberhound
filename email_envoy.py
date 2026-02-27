"""
Email Envoy - Sends Imperial Ledger to targets
Uses centralized config - NO hardcoded credentials
"""
import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from config import (
    SMTP_SERVER, SMTP_PORT, SMTP_USER, SMTP_PASS,
    DEFAULT_FROM_NAME, LEDGER_PATH, check_config
)

def deploy_envoy(target_email, target_name):
    """Send the Premium Imperial Ledger to a target"""
    
    if not check_config():
        return False
    
    print(f"🚀 120 OS: DEPLOYING ENVOY TO {target_name.upper()}...")

    # Create Message
    msg = MIMEMultipart()
    msg['From'] = f"{DEFAULT_FROM_NAME} <{SMTP_USER}>"
    msg['To'] = target_email
    msg['Subject'] = f"STRATEGIC ADVISORY: {target_name} & Bill 96 Compliance"

    body = f"""
Bonjour {target_name} Team,

Our market intelligence division has identified significant linguistic and 
branding opportunities for your firm regarding the latest Bill 96 compliance 
thresholds in Quebec.

Attached is a Confidential Venture Ledger prepared by Northern Ventures, 
detailing a 'Souverain' rebrand strategy to mitigate regulatory risk and 
capture the premium Quebecois market.

We look forward to your response.

Sincèrement,
Bee
Northern Ventures
"""
    msg.attach(MIMEText(body, 'plain'))

    # Attach the Ledger
    try:
        with open(LEDGER_PATH, "rb") as attachment:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment.read())
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition", 
                f"attachment; filename= {os.path.basename(LEDGER_PATH)}"
            )
            msg.attach(part)
        
        # Connect to SMTP
        print(f"📧 Connecting to {SMTP_SERVER}...")
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ ENVOY DELIVERED: {target_name} has received the Ledger.")
        return True
        
    except FileNotFoundError:
        print(f"❌ Ledger not found: {LEDGER_PATH}")
        print("   Run: python3 build_ledger_premium.py")
        return False
    except Exception as e:
        print(f"⚠️ Envoy Interrupted: {e}")
        return False

if __name__ == "__main__":
    # Example usage - replace with actual target emails
    # deploy_envoy("contact@stingray.com", "Stingray Digital Group")
    
    print("⚡ 120 OS: EMAIL ENVOY")
    print("=" * 60)
    print("\nTo deploy:")
    print("1. Copy .env.example to .env")
    print("2. Fill in your Gmail credentials")
    print("3. Uncomment and modify the deploy_envoy() call below")
    print("\nExample:")
    print('  deploy_envoy("contact@example.com", "Target Company")')
