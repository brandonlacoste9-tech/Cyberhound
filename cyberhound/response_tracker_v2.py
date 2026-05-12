"""
Response Tracker V2 - Auto-closing watchdog
When a target replies:
  1. Logs it
  2. Moves deal to REPLIED in deal_tracker
  3. Auto-fires the warm reply email within 5 minutes
  4. Prints a loud alert
"""
import imaplib
import email
from email.header import decode_header
import json
import os
import time
from datetime import datetime
from cyberhound.config import IMAP_SERVER, IMAP_USER, IMAP_PASS, TRACKED_DOMAINS, check_config
from cyberhound.deal_tracker import upsert_deal, get_deal, Stage, list_deals

LOG_FILE = "Empire_Comms.log"

class EmpireWatchdogV2:
    def __init__(self, auto_respond: bool = True):
        self.tracked_domains = TRACKED_DOMAINS
        self.auto_respond = auto_respond
        self.processed_ids = self._load_processed_ids()

    def _load_processed_ids(self) -> set:
        """Load already-processed message IDs to avoid duplicate autoresponses"""
        cache_file = ".watchdog_cache.json"
        if os.path.exists(cache_file):
            with open(cache_file) as f:
                try:
                    return set(json.load(f))
                except:
                    return set()
        return set()

    def _save_processed_ids(self):
        with open(".watchdog_cache.json", "w") as f:
            json.dump(list(self.processed_ids), f)

    def connect(self):
        try:
            mail = imaplib.IMAP4_SSL(IMAP_SERVER)
            mail.login(IMAP_USER, IMAP_PASS)
            print("✅ Watchdog V2 connected to Gmail IMAP")
            return mail
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return None

    def _decode_str(self, value):
        if isinstance(value, bytes):
            return value.decode(errors="replace")
        return value or ""

    def check_for_replies(self, mail) -> list:
        mail.select("inbox")
        _, search_data = mail.search(None, "UNSEEN")
        replies_found = []

        for num in search_data[0].split():
            _, data = mail.fetch(num, "(RFC822)")
            raw = data[0][1]
            msg = email.message_from_bytes(raw)

            from_raw = decode_header(msg.get("From", ""))[0]
            from_addr = self._decode_str(from_raw[0])
            msg_id = msg.get("Message-ID", str(num))

            # Skip already processed
            if msg_id in self.processed_ids:
                continue

            # Check against tracked domains
            matched_domain = None
            for domain in self.tracked_domains:
                if domain.lower() in from_addr.lower():
                    matched_domain = domain
                    break

            if not matched_domain:
                continue

            subject_raw = decode_header(msg.get("Subject", "No Subject"))[0]
            subject = self._decode_str(subject_raw[0])

            reply = {
                "timestamp": str(datetime.now()),
                "from": from_addr,
                "subject": subject,
                "domain": matched_domain,
                "msg_id": msg_id
            }
            replies_found.append(reply)

            # Loud alert
            print("\n" + "🚨"*20)
            print("  EMPIRE ALERT: TARGET REPLY DETECTED")
            print("🚨"*20)
            print(f"  FROM:    {from_addr}")
            print(f"  SUBJECT: {subject}")
            print(f"  DOMAIN:  {matched_domain}")
            print(f"  TIME:    {datetime.now()}")
            print("🚨"*20 + "\n")

            # Log it
            self._log(reply)

            # Find matching deal and auto-respond
            deals = list_deals()
            matched_deal = next(
                (d for d in deals if matched_domain.lower() in d["email"].lower()),
                None
            )

            if matched_deal:
                target_email = matched_deal["email"]
                target_name = matched_deal["name"]

                # Move to REPLIED stage
                current_stage = matched_deal.get("stage")
                if current_stage == Stage.PROSPECT:
                    upsert_deal(target_email, target_name, Stage.REPLIED,
                                notes=f"Replied {datetime.now().strftime('%Y-%m-%d %H:%M')} | Subject: {subject}")

                # Auto fire response
                if self.auto_respond and current_stage in [Stage.PROSPECT, Stage.REPLIED]:
                    print(f"🤖 AUTO-RESPONDING to {target_name}...")
                    from cyberhound.email_envoy_v2 import fire_reply_autoresponse
                    fire_reply_autoresponse(target_email, target_name)
                else:
                    print(f"ℹ️  Deal already at {current_stage} — skipping auto-response")
            else:
                print(f"⚠️  No deal found for domain {matched_domain} — add manually")

            self.processed_ids.add(msg_id)
            self._save_processed_ids()

        return replies_found

    def _log(self, entry: dict):
        logs = []
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE) as f:
                try:
                    logs = json.load(f)
                except:
                    logs = []
        logs.append(entry)
        with open(LOG_FILE, "w") as f:
            json.dump(logs, f, indent=2)

    def watch(self, interval: int = 60):
        print("⚡ EMPIRE WATCHDOG V2 — AUTO-CLOSING ENABLED")
        print("="*60)
        print(f"👁️  Tracking: {', '.join(self.tracked_domains)}")
        print(f"🤖 Auto-respond: {'ON' if self.auto_respond else 'OFF'}")
        print(f"🔄 Interval: {interval}s")
        print("="*60 + "\n")

        mail = self.connect()
        if not mail:
            return

        try:
            while True:
                replies = self.check_for_replies(mail)
                if not replies:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Scanning... no new replies")
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\n🛑 Watchdog stopped")
            mail.logout()
        except Exception as e:
            print(f"\n⚠️  Watchdog error: {e}")
            try:
                mail.logout()
            except:
                pass


def main():
    print("⚡ 120 OS: RESPONSE TRACKER V2")
    print("="*60)
    if not check_config():
        return
    watchdog = EmpireWatchdogV2(auto_respond=True)
    watchdog.watch(interval=30)

if __name__ == "__main__":
    main()
