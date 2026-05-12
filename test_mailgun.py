import os
import requests
from dotenv import load_dotenv

# Load env from apps/web/.env.local if present
load_dotenv("apps/web/.env.local")

def send_simple_message():
    api_key = os.getenv('MAILGUN_API_KEY')
    domain = os.getenv('MAILGUN_DOMAIN')
    base_url = os.getenv('MAILGUN_BASE_URL', 'https://api.mailgun.net').rstrip('/')

    print(f"Testing Mailgun delivery via {domain}...")
    
    res = requests.post(
        f"{base_url}/v3/{domain}/messages",
        auth=("api", api_key),
        data={
            "from": f"Mailgun Sandbox <postmaster@{domain}>",
            "to": "Brandon Lacoste <brandonlacoste9@gmail.com>",
            "subject": "Hello Brandon Lacoste",
            "text": "Congratulations Brandon Lacoste, you just sent an email with Mailgun! You are truly awesome!"
        }
    )
    
    if res.status_code == 200:
        print("Success! Response:", res.json())
    else:
        print(f"Failed ({res.status_code}):", res.text)

if __name__ == "__main__":
    send_simple_message()
