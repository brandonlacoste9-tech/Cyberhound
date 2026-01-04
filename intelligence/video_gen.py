import os
import json
import vertexai
from vertexai.preview.vision import VideoGenerationModel
from vertexai.generative_models import GenerativeModel

# Logic:
# 1. Receive Deal Data (High Value Score > 100)
# 2. Gemini 1.5 Flash updates the "Creative Directive" (Prompt)
# 3. Veo (VideoGenerationModel) creates the MP4
# 4. Save to 'media/videos/' for upload

PROJECT_ID = os.environ.get("GCP_PROJECT")
LOCATION = "us-central1"

def create_cinematic_ad(deal):
    """
    Orchestrates the creation of a video ad for a high-value deal.
    """
    if not PROJECT_ID:
        print("[-] GCP_PROJECT not set. Cannot run Video Engine.")
        return None

    vertexai.init(project=PROJECT_ID, location=LOCATION)
    
    # 1. The Creative Director (Gemini)
    creative_brain = GenerativeModel("gemini-1.5-flash-001")
    
    brand = deal.get("brand", "Unknown")
    discount = deal.get("discount_amount", "Special")
    summary = deal.get("summary", "")
    
    design_brief = f"""
    You are a world-class Sci-Fi Visual Director.
    Create a 1-sentence, highly visual AI video prompt for Google Veo.
    
    SUBJECT: {brand}
    OFFER: {discount} discount
    CONTEXT: {summary}
    STYLE: Cyberpunk, Neon-Noir, Cinematic, 8k, Unreal Engine 5 render.
    
    The video should NOT have text overlay (we add that later). 
    Focus on the visual metaphor of the brand. 
    Examples: 
    - "A glowing neon Shopify bag floating in a rainy cyber-city."
    - "A high-speed digital tunnel forming the Adobe logo."
    
    OUTPUT: Just the prompt text.
    """
    
    try:
        response = creative_brain.generate_content(design_brief)
        veo_prompt = response.text.strip()
        print(f"[*] Creative Directive: {veo_prompt}")
        
    except Exception as e:
        print(f"[-] Creative Director Failed: {e}")
        return None

    # 2. The Production Studio (Veo)
    try:
        # Note: Model name subject to change (e.g., 'veo-001' or 'video-generation-001')
        print("[*] Rolling Camera (Veo)...")
        veo_model = VideoGenerationModel.from_pretrained("video-generation-001") 
        
        video_response = veo_model.generate_video(
            prompt=veo_prompt,
            number_of_videos=1
        )
        
        video = video_response.videos[0]
        
        # Save output
        filename = f"ad_{deal['id']}_{brand}.mp4"
        output_path = os.path.join("media", "videos", filename)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        video.save(output_path)
        print(f"[+] CUT! Video saved to {output_path}")
        return output_path
        
    except Exception as e:
        print(f"[-] Production Failed: {e}")
        return None

# For testing
if __name__ == "__main__":
    test_deal = {
        "id": 999,
        "brand": "Cyberhound",
        "discount_amount": "50%",
        "summary": "The ultimate AI Automated Intelligence Agency."
    }
    create_cinematic_ad(test_deal)
