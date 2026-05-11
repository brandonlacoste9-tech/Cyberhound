import os
import requests
from dotenv import load_dotenv

load_dotenv(".env")
key = os.getenv("DEEPSEEK_API_KEY")

print(f"Testing DeepSeek with key: {key[:10]}...")

headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
payload = {
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Say 'ALPHA' if you are alive."}],
    "stream": False
}

try:
    response = requests.post("https://api.deepseek.com/chat/completions", headers=headers, json=payload, timeout=30)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()['choices'][0]['message']['content']}")
except Exception as e:
    print(f"Error: {e}")
