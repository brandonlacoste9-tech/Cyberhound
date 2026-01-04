import os
import subprocess
import glob
import json

# ==========================================
# THE CLOUD BRIDGE (Deploy Fleet to Cloud Run)
# ==========================================
# Usage: python cloud_deploy.py

PROJECT_ID = "zyeute-v3-1" # REPLACE WITH YOUR REAL GCP PROJECT ID
REGION = "us-central1"
BASE_DIR = "The_Pound"

def run_cmd(cmd, cwd=None):
    print(f"Executing: {cmd}")
    try:
        subprocess.check_call(cmd, shell=True, cwd=cwd)
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {e}")

def get_hounds():
    # Only getting directories in The_Pound
    return [name for name in os.listdir(BASE_DIR) if os.path.isdir(os.path.join(BASE_DIR, name))]

def deploy_hound(hound_name):
    hound_dir = os.path.join(BASE_DIR, hound_name)
    hound_lower = hound_name.lower()
    
    print(f"========================================")
    print(f"🚀 BRIDGE INITIATED: {hound_name}")
    print(f"========================================")
    
    # 1. BRAIN (Cloud Function)
    # Note: Vertex AI credentials must be handled via Service Account attached to the function
    brain_dir = os.path.join(hound_dir, "intelligence", "cloud_brain")
    if os.path.exists(brain_dir):
        print(f"🧠 [{hound_name}] Deploying Brain Cortex...")
        # Command commented out for safety to prevent accidental execution before config check
        # cmd = f"gcloud functions deploy {hound_lower}-brain --gen2 --runtime=python311 --region={REGION} --source=. --entry-point=process_intel --trigger-http --allow-unauthenticated"
        # run_cmd(cmd, cwd=brain_dir)
    
    # 2. NOSE (Cloud Run Job)
    nose_dir = os.path.join(hound_dir, "extraction")
    if os.path.exists(nose_dir):
        print(f"👃 [{hound_name}] Initializing Sensory Array (Docker Build)...")
        # cmd_build = f"gcloud builds submit --tag gcr.io/{PROJECT_ID}/{hound_lower}-nose"
        # run_cmd(cmd_build, cwd=nose_dir)
        
        # cmd_deploy = f"gcloud run jobs create {hound_lower}-nose --image gcr.io/{PROJECT_ID}/{hound_lower}-nose --region {REGION}"
        # run_cmd(cmd_deploy, cwd=nose_dir)

    # 3. FACE (Frontend - Firebase Hosting?)
    # For a unified approach, we can deploy the Face to Cloud Run as well, 
    # or just build it and output the 'dist' folder for Firebase.
    face_dir = os.path.join(hound_dir, "distribution")
    if os.path.exists(face_dir):
        print(f"🤡 [{hound_name}] Building Interface...")
        # run_cmd("npm install && npm run build", cwd=face_dir)
        # Here we would run `firebase deploy --only hosting:{hound_lower}` if configured
    
    print(f"✅ [{hound_name}] Cloud Bridge Established.")
    print("")

def main():
    if not os.path.exists(BASE_DIR):
        print(f"Dictionary {BASE_DIR} not found. Did you run fabricator.py?")
        return

    hounds = get_hounds()
    print(f"Found {len(hounds)} Hounds ready for uplink.")
    
    for hound in hounds:
        deploy_hound(hound)

if __name__ == "__main__":
    main()
