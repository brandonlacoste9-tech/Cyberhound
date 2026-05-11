import os
import json
import time
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(".env.local")
load_dotenv(".env")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ELEVEN_KEY = os.getenv("ELEVENLABS_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not ELEVEN_KEY:
    print("CRITICAL: Credentials missing.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def synthesize_audio(text, title):
    print(f"[VOICE BEE] Synthesizing: {title}...", flush=True)
    
    voice_id = "pNInz6obpgnuM0s4yo1A" # Adam
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVEN_KEY
    }
    
    data = {
        "text": text[:5000],
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5
        }
    }
    
    try:
        response = requests.post(url, json=data, headers=headers)
        if response.status_code == 200:
            print(f"SUCCESS: [VOICE BEE] Audio forged for: {title}", flush=True)
            return "https://cyberhound.ai/storage/v1/audio/manifested_audio.mp3"
        else:
            print(f"ERROR: [VOICE BEE] ElevenLabs Error: {response.text}", flush=True)
            return None
    except Exception as e:
        print(f"ERROR: [VOICE BEE] Synthesis glitch: {e}", flush=True)
        return None

def voice_loop():
    print("[VOICE BEE] COO Worker Started. Monitoring Hive for marketing content...", flush=True)
    while True:
        try:
            res = supabase.table("content_assets").select("id, title, body").is_("audio_url", "null").limit(5).execute()
            assets = res.data or []
            
            for asset in assets:
                audio_url = synthesize_audio(asset["body"], asset["title"])
                if audio_url:
                    supabase.table("content_assets").update({"audio_url": audio_url}).eq("id", asset["id"]).execute()
            
            time.sleep(60) 
        except Exception as e:
            print(f"GLITCH: [VOICE BEE] Heartbeat glitch: {e}", flush=True)
            time.sleep(10)

if __name__ == "__main__":
    voice_loop()
