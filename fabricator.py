import os
import json
import shutil
import time

# FABRICATOR: The Clone Factory
# Usage: python fabricator.py

BLUEPRINT_FILE = "fleet_blueprint.json"
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # Cyberhound root
FLEET_DIR = os.path.join(os.path.dirname(BASE_DIR), "The_Pound") # Where clones go

def fabricate_fleet():
    if not os.path.exists(BLUEPRINT_FILE):
        print("[-] Missing Blueprint!")
        return

    with open(BLUEPRINT_FILE, 'r') as f:
        blueprint = json.load(f)
    
    # Create The Pound if not exists
    os.makedirs(FLEET_DIR, exist_ok=True)
    
    print(f"[*] Fabricator Initialized. Target: {len(blueprint)} Hounds.")
    
    for hound in blueprint:
        name = hound['name']
        print(f"[*] Cloning {name}...")
        
        target_dir = os.path.join(FLEET_DIR, name)
        
        # 1. Copy the BASE Architecture
        # Skip special dirs like .git or node_modules for speed/cleanliness if needed
        # evaluating simplified copytree
        if os.path.exists(target_dir):
            shutil.rmtree(target_dir)
            
        # We copy everything in Cyberhound EXCEPT node_modules and .git
        shutil.copytree(BASE_DIR, target_dir, ignore=shutil.ignore_patterns('node_modules', '.git', 'dist', '__pycache__'))
        
        # 2. Inject DNA (Config Modifications)
        
        # A. Update Brain Prompt
        brain_path = os.path.join(target_dir, "intelligence", "cloud_brain", "main.py")
        with open(brain_path, 'r', encoding='utf-8') as f:
            brain_code = f.read()
        
        # Inject custom prompt
        # We look for the generic prompt string and replace it or inject a variable
        # For robustness, we will create a config file for the brain to read, OR direct replace.
        # Direct replace hack for V1:
        new_prompt = f'Analyze the following text... Context: {hound["target_prompt"]}'
        brain_code = brain_code.replace("Analyze the following text from a website", new_prompt)
        
        with open(brain_path, 'w', encoding='utf-8') as f:
            f.write(brain_code)
            
        # B. Update Nose Targets
        nose_config_path = os.path.join(target_dir, "extraction", "targets.json")
        with open(nose_config_path, 'w', encoding='utf-8') as f:
            json.dump(hound['targets'], f)
            
        # Note: You need to update trigger.py to read from targets.json instead of hardcoded
        ensure_nose_mock(target_dir, hound['targets'])

        # C. Update Ghost Map
        ghost_path = os.path.join(target_dir, "intelligence", "affiliate_map.json")
        with open(ghost_path, 'w') as f:
            json.dump(hound['affiliates'], f)
            
        # D. Update Face (Tailwind & Name)
        # We update App.tsx title and tailwind.config
        app_path = os.path.join(target_dir, "distribution", "src", "App.tsx")
        with open(app_path, 'r', encoding='utf-8') as f:
            app_code = f.read()
        
        app_code = app_code.replace("CYBERHOUND", name.upper())
        app_code = app_code.replace("Cyberhound", name) 
        
        with open(app_path, 'w', encoding='utf-8') as f:
            f.write(app_code)
            
        # 3. Output Deploy Script
        deploy_script = f"""
        # DEPLOYMENT FOR {name.upper()}
        # 1. NOSE
        cd extraction && gcloud builds submit --tag gcr.io/$PROJECT_ID/{name.lower()}-nose
        # 2. BRAIN
        cd ../intelligence/cloud_brain && gcloud functions deploy {name.lower()}-brain ...
        """
        with open(os.path.join(target_dir, "DEPLOY_ME.txt"), 'w') as f:
            f.write(deploy_script)
            
        print(f"[+] {name} Fabricated in {target_dir}")

def ensure_nose_mock(target_dir, targets):
    # Quick fix to make trigger.py dynamic or just overwrite it with hardcoded targets for now
    trigger_path = os.path.join(target_dir, "extraction", "trigger.py")
    if os.path.exists(trigger_path):
        with open(trigger_path, 'r', encoding='utf-8') as f:
            code = f.read()
    
    # Very rough replace for the hardcoded list in trigger.py if it exists
    # Ideally trigger.py reads env var or json. 
    # Let's just create a dynamic_trigger.py
    pass 

if __name__ == "__main__":
    fabricate_fleet()
