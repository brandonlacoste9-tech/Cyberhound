"""
Email Envoy V2 - HTML Sequence Engine
No Calendly — direct reply/call CTAs only.
"""
import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
from cyberhound.config import SMTP_SERVER, SMTP_PORT, SMTP_USER, SMTP_PASS, DEFAULT_FROM_NAME, check_config
from cyberhound.email_templates import touch_1_strike, touch_2_followup, touch_3_final, touch_4_reply_autoresponse, touch_5_post_call
from cyberhound.deal_tracker import upsert_deal, get_deal, Stage

# ── Configure in .env ────────────────────────────────────────
REPLY_EMAIL  = os.getenv("REPLY_EMAIL",  SMTP_USER)
PHONE        = os.getenv("CONTACT_PHONE", "+1 (514) 000-0000")
STRIPE_AUDIT_LINK    = os.getenv("STRIPE_AUDIT_LINK",    "https://buy.stripe.com/YOUR_AUDIT_LINK")
STRIPE_RETAINER_LINK = os.getenv("STRIPE_RETAINER_LINK", "https://buy.stripe.com/YOUR_RETAINER_LINK")
# ────────────────────────────────────────────────────────────

def _send_html(to_email: str, to_name: str, subject: str, html_body: str,
               attachments: list = []) -> bool:
    if not check_config():
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{DEFAULT_FROM_NAME} <{SMTP_USER}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    for file_path, display_name in attachments:
        try:
            with open(file_path, "rb") as f:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header("Content-Disposition", f"attachment; filename={display_name}")
                msg.attach(part)
        except FileNotFoundError:
            print(f"   ⚠️  Attachment not found: {file_path}")

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        print(f"✅ EMAIL SENT → {to_name} <{to_email}> | {subject[:55]}")
        return True
    except Exception as e:
        print(f"❌ Send failed: {e}")
        return False


def fire_touch_1(target_email: str, target_name: str, risk_score: int = 7,
                 bill96_issues: list = None, attach_ledger: bool = True) -> bool:
    template = touch_1_strike(target_name, risk_score, REPLY_EMAIL, PHONE, bill96_issues)
    attachments = []
    if attach_ledger and os.path.exists("IMPERIAL_PREMIUM_LEDGER.pdf"):
        attachments.append(("IMPERIAL_PREMIUM_LEDGER.pdf",
                            f"{target_name.replace(' ','_')}_Compliance_Audit.pdf"))
    success = _send_html(target_email, target_name, template["subject"], template["html"], attachments)
    if success:
        upsert_deal(target_email, target_name, Stage.PROSPECT,
                    notes=f"Touch 1 sent {datetime.now().strftime('%Y-%m-%d')} | Risk: {risk_score}/10")
    return success


def fire_touch_2(target_email: str, target_name: str) -> bool:
    deal = get_deal(target_email)
    if deal and deal["stage"] in [Stage.REPLIED, Stage.CALLED, Stage.CLOSED_WON]:
        print(f"⏭️  Skipping Touch 2 — {target_name} already at {deal['stage']}")
        return False
    template = touch_2_followup(target_name, REPLY_EMAIL, PHONE)
    success = _send_html(target_email, target_name, template["subject"], template["html"])
    if success:
        upsert_deal(target_email, target_name, Stage.PROSPECT,
                    notes=f"Touch 2 sent {datetime.now().strftime('%Y-%m-%d')}")
    return success


def fire_touch_3(target_email: str, target_name: str) -> bool:
    deal = get_deal(target_email)
    if deal and deal["stage"] in [Stage.REPLIED, Stage.CALLED, Stage.CLOSED_WON]:
        print(f"⏭️  Skipping Touch 3 — {target_name} already at {deal['stage']}")
        return False
    template = touch_3_final(target_name, REPLY_EMAIL, PHONE)
    success = _send_html(target_email, target_name, template["subject"], template["html"])
    if success:
        upsert_deal(target_email, target_name, Stage.PROSPECT,
                    notes=f"Touch 3 sent {datetime.now().strftime('%Y-%m-%d')} — final push")
    return success


def fire_reply_autoresponse(target_email: str, target_name: str) -> bool:
    template = touch_4_reply_autoresponse(target_name, REPLY_EMAIL, PHONE)
    success = _send_html(target_email, target_name, template["subject"], template["html"])
    if success:
        upsert_deal(target_email, target_name, Stage.REPLIED,
                    notes=f"Reply detected + auto-response {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    return success


def fire_post_call(target_email: str, target_name: str,
                   offer: str = "Imperial Growth Retainer — $3,500 CAD/mo",
                   use_retainer: bool = True) -> bool:
    stripe_link = STRIPE_RETAINER_LINK if use_retainer else STRIPE_AUDIT_LINK
    template = touch_5_post_call(target_name, offer, stripe_link, REPLY_EMAIL)
    success = _send_html(target_email, target_name, template["subject"], template["html"])
    if success:
        upsert_deal(target_email, target_name, Stage.CALLED,
                    notes=f"Post-call email {datetime.now().strftime('%Y-%m-%d')} | {offer}",
                    stripe_link=stripe_link)
    return success


def mark_closed_won(target_email: str, target_name: str, amount: str = "") -> bool:
    upsert_deal(target_email, target_name, Stage.CLOSED_WON,
                notes=f"CLOSED WON {datetime.now().strftime('%Y-%m-%d')} | {amount}")
    print(f"🏆 CLOSED WON: {target_name} — {amount}")
    return True


def mark_closed_lost(target_email: str, target_name: str, reason: str = "") -> bool:
    upsert_deal(target_email, target_name, Stage.CLOSED_LOST,
                notes=f"LOST {datetime.now().strftime('%Y-%m-%d')} | {reason}")
    print(f"📉 LOST: {target_name} — {reason}")
    return True


if __name__ == "__main__":
    print("⚡ EMAIL ENVOY V2 — NO CALENDLY, DIRECT CONTACT")
    print("="*60)
    print("Set in .env:")
    print("  REPLY_EMAIL=bee@northernventures.ca")
    print("  CONTACT_PHONE=+1 (514) 000-0000")
    print("  STRIPE_AUDIT_LINK=https://buy.stripe.com/...")
    print("  STRIPE_RETAINER_LINK=https://buy.stripe.com/...")
