"""
Response Tracker - Monitors Gmail for target replies
Completes the autonomous Empire loop
"""
import imaplib
import email
from email.header import decode_header
import json
import os
import time
from datetime import datetime
from config import (
    IMAP_SERVER, IMAP_USER, IMAP_PASS,
    TRACKED_DOMAINS, check_config
)

class EmpireWatchdog:
    def __init__(self):
        self.tracked_domains = TRACKED_DOMAINS
        self.log_file = 'Empire_Comms.log'
        self.gmail_user = IMAP_USER
        self.gmail_pass = IMAP_PASS
        
    def connect(self):
        """Connect to Gmail IMAP"""
        try:
            mail = imaplib.IMAP4_SSL(IMAP_SERVER)
            mail.login(self.gmail_user, self.gmail_pass)
            print("✅ Watchdog connected to Gmail IMAP")
            return mail
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return None
    
    def check_for_replies(self, mail):
        """Scan inbox for target replies"""
        mail.select('inbox')
        
        # Search for unread emails
        _, search_data = mail.search(None, 'UNSEEN')
        
        replies_found = []
        
        for num in search_data[0].split():
            _, data = mail.fetch(num, '(RFC822)')
            raw_email = data[0][1]
            email_message = email.message_from_bytes(raw_email)
            
            # Get sender
            from_header = decode_header(email_message['From'])[0]
            from_addr = from_header[0]
            if isinstance(from_addr, bytes):
                from_addr = from_addr.decode()
            
            # Check if from tracked domain
            for domain in self.tracked_domains:
                if domain in from_addr.lower():
                    subject = decode_header(email_message['Subject'])[0][0]
                    if isinstance(subject, bytes):
                        subject = subject.decode()
                    
                    reply = {
                        'timestamp': str(datetime.now()),
                        'from': from_addr,
                        'subject': subject,
                        'domain': domain,
                        'status': 'TARGET_REPLY'
                    }
                    replies_found.append(reply)
                    self.log_interaction(reply)
                    
                    # Alert
                    print("\n" + "="*60)
                    print("🚨 EMPIRE ALERT: TARGET REPLY DETECTED")
                    print("="*60)
                    print(f"📧 From: {from_addr}")
                    print(f"📝 Subject: {subject}")
                    print(f"🏢 Domain: {domain}")
                    print(f"⏰ Time: {datetime.now()}")
                    print("="*60 + "\n")
        
        return replies_found
    
    def log_interaction(self, interaction):
        """Log to Empire Comms file"""
        log_entry = {
            'timestamp': interaction['timestamp'],
            'type': interaction.get('status', 'UNKNOWN'),
            'from': interaction['from'],
            'subject': interaction.get('subject', 'N/A'),
            'domain': interaction.get('domain', 'N/A')
        }
        
        # Append to log
        if os.path.exists(self.log_file):
            with open(self.log_file, 'r') as f:
                try:
                    logs = json.load(f)
                except:
                    logs = []
        else:
            logs = []
        
        logs.append(log_entry)
        
        with open(self.log_file, 'w') as f:
            json.dump(logs, f, indent=2)
    
    def watch(self, interval=60):
        """Main watchdog loop"""
        print("⚡ 120 OS: EMPIRE WATCHDOG ACTIVATED")
        print("="*60)
        print(f"👁️  Monitoring: {', '.join(self.tracked_domains)}")
        print(f"🔄 Check interval: {interval} seconds")
        print(f"📜 Log file: {self.log_file}")
        print("="*60)
        print("\nWaiting for target replies... (Ctrl+C to stop)\n")
        
        mail = self.connect()
        if not mail:
            return
        
        try:
            while True:
                replies = self.check_for_replies(mail)
                if not replies:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] No new replies...")
                
                time.sleep(interval)
                
        except KeyboardInterrupt:
            print("\n\n🛑 Watchdog stopped by user")
            mail.logout()
        except Exception as e:
            print(f"\n⚠️ Watchdog error: {e}")
            mail.logout()

def main():
    """Initialize the Watchdog"""
    print("⚡ 120 OS: RESPONSE TRACKER")
    print("="*60)
    
    # Check for credentials
    if not check_config():
        print("\nSet credentials in your .env file:")
        print("  cp .env.example .env")
        print("  nano .env  # Edit with your credentials")
        return
    
    # Start watchdog
    watchdog = EmpireWatchdog()
    watchdog.watch(interval=30)  # Check every 30 seconds

if __name__ == "__main__":
    main()
