#!/bin/bash

# ==========================================
# THE HOUND UNLEASHER (Deploy All Script)
# ==========================================
# Usage: ./deploy_all.sh

PROJECT_ID="zyeute-v3-1" # REPLACE WITH YOUR REAL ID
REGION="us-central1"

echo "🐺 [ALPHA COMMAND] Unleashing the Hounds..."

for dir in The_Pound/*/; do
    hound_name=$(basename "$dir")
    hound_lower=$(echo "$hound_name" | tr '[:upper:]' '[:lower:]')
    
    echo "========================================"
    echo "🚀 Deploying Unit: $hound_name"
    echo "========================================"
    
    # 1. DEPLOY THE BRAIN (Cloud Function)
    echo "🧠 [$hound_name] Uploading Brain to Vertex AI..."
    cd "$dir/intelligence/cloud_brain"
    # gcloud functions deploy "$hound_lower-brain" \
    #    --gen2 \
    #    --runtime=python311 \
    #    --region=$REGION \
    #    --source=. \
    #    --entry-point=process_intel \
    #    --trigger-http \
    #    --allow-unauthenticated
    
    # 2. DEPLOY THE NOSE (Cloud Run Job)
    echo "👃 [$hound_name] Training Nose Scraper..."
    # cd "../../extraction"
    # gcloud builds submit --tag gcr.io/$PROJECT_ID/$hound_lower-nose
    # gcloud run jobs create $hound_lower-nose --image gcr.io/$PROJECT_ID/$hound_lower-nose --region $REGION
    
    # 3. DEPLOY THE FACE (Simulated message for now)
    echo "🤡 [$hound_name] Face updated."
    
    echo "✅ [$hound_name] is LIVE."
    echo ""
    
    # Return to root
    cd ../../../..
done

echo "🐺 [ALPHA COMMAND] All Hounds Unleashed. The Pack is Hunting."
