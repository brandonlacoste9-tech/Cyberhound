"""
AdGenXai Pitch Generator - The Money Bridge
Creates 3-slide Leather & Gold pitch decks from IronClaw intelligence
"""
from fpdf import FPDF
import json
import datetime
from pathlib import Path

class AdGenXaiPitchDeck(FPDF):
    """Premium pitch deck generator for AI ad services"""
    
    def __init__(self, target_name):
        super().__init__(orientation='L', unit='mm', format='A4')
        self.target_name = target_name
        self.set_auto_page_break(auto=False)
        
    def header(self):
        # Dark leather header
        self.set_fill_color(26, 26, 26)
        self.rect(0, 0, 297, 25, 'F')
        
        # Gold accent line
        self.set_draw_color(212, 175, 55)
        self.set_line_width(1)
        self.line(10, 25, 287, 25)
        
        # Logo text
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(212, 175, 55)
        self.cell(0, 15, 'AdGenXai by Northern Ventures', 0, 0, 'L')
        
        # Page indicator
        self.cell(0, 15, f'CONFIDENTIAL | {self.target_name}', 0, 0, 'R')
        
    def slide_title(self, title, subtitle=""):
        """Create slide title block"""
        self.set_y(35)
        self.set_font('Helvetica', 'B', 28)
        self.set_text_color(212, 175, 55)
        self.cell(0, 15, title, 0, 1, 'C')
        
        if subtitle:
            self.set_font('Helvetica', 'I', 14)
            self.set_text_color(100, 100, 100)
            self.cell(0, 10, subtitle, 0, 1, 'C')
        self.ln(5)
        
    def slide_box(self, x, y, w, h, title, content, accent_color=(212, 175, 55)):
        """Create content box with accent"""
        # Box background
        self.set_fill_color(245, 245, 245)
        self.rect(x, y, w, h, 'F')
        
        # Accent bar
        self.set_fill_color(*accent_color)
        self.rect(x, y, 3, h, 'F')
        
        # Title
        self.set_xy(x + 8, y + 5)
        self.set_font('Helvetica', 'B', 12)
        self.set_text_color(40, 40, 40)
        self.cell(w - 16, 8, title, 0, 1)
        
        # Content
        self.set_xy(x + 8, y + 15)
        self.set_font('Helvetica', '', 10)
        self.set_text_color(60, 60, 60)
        self.multi_cell(w - 16, 6, content)

def generate_pitch_deck(target_data, output_name=None):
    """Generate 3-slide pitch deck for a target"""
    
    target_name = target_data.get('name', 'Unknown Target')
    city = target_data.get('city', 'Montreal')
    risk_score = target_data.get('english_only_risk', 5)
    
    if not output_name:
        safe_name = target_name.replace(' ', '_').replace('.', '').upper()
        output_name = f"PITCH_{safe_name}_AdGenXai.pdf"
    
    pdf = AdGenXaiPitchDeck(target_name)
    
    # === SLIDE 1: THE PROBLEM ===
    pdf.add_page()
    pdf.slide_title(
        "THE INVISIBLE TAX ON YOUR GROWTH",
        f"Why {target_name} is leaving 40% of the Quebec market untapped"
    )
    
    # Left box: The Risk
    risk_text = (
        f"Current Risk Assessment: {risk_score}/10 (HIGH)\n\n"
        f"Your brand operates primarily in English, creating friction with "
        f"the 8.5M French-speaking consumers in Quebec. Bill 96 compliance "
        f"is not just legal, it is market access."
    )
    pdf.slide_box(10, 60, 135, 100, "THE COMPLIANCE GAP", risk_text, (200, 50, 50))
    
    # Right box: The Opportunity
    opp_text = (
        "Quebec Market Value:\n"
        "- $450B annual consumer spending\n"
        "- 80% prefer French-first brands\n"
        "- 23% premium on Souverain positioning\n\n"
        "The market is there. The question is access."
    )
    pdf.slide_box(152, 60, 135, 100, "THE OPPORTUNITY", opp_text, (50, 150, 50))
    
    # Bottom stat bar
    pdf.set_y(170)
    pdf.set_fill_color(26, 26, 26)
    pdf.rect(0, 170, 297, 30, 'F')
    pdf.set_font('Helvetica', 'B', 16)
    pdf.set_text_color(212, 175, 55)
    pdf.cell(0, 20, "SOLUTION: AI-POWERED SOUVERAIN LOCALIZATION", 0, 0, 'C')
    
    # === SLIDE 2: THE AI SWARM ADVANTAGE ===
    pdf.add_page()
    pdf.slide_title(
        "THE AdGenXai AUTONOMOUS SYSTEM",
        "What 10 agency staff do in a week, our swarm does in 10 minutes"
    )
    
    # Three columns
    services = [
        ("DISCOVER", 
         "Ghost Hound intelligence scans the market for positioning gaps. "
         "We identify what competitors miss.",
         (100, 100, 200)),
        ("CREATE", 
         "Manus AI generates 100+ ad variants: copy, visuals, hooks "
         "optimized for Quebec's Joual culture.",
         (200, 150, 50)),
        ("DEPLOY", 
         "Meta's algorithm auto-optimizes spend. We monitor, iterate, "
         "scale. You watch revenue grow.",
         (50, 150, 100))
    ]
    
    x_positions = [10, 102, 194]
    
    for i, (title, desc, color) in enumerate(services):
        pdf.slide_box(x_positions[i], 60, 93, 120, title, desc, color)
    
    # Bottom metrics
    pdf.set_y(190)
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(99, 10, "SPEED: 100x Faster", 0, 0, 'C')
    pdf.cell(99, 10, "COST: 90% Lower", 0, 0, 'C')
    pdf.cell(99, 10, "SCALE: Infinite", 0, 0, 'C')
    
    # === SLIDE 3: THE OFFER ===
    pdf.add_page()
    pdf.slide_title(
        "THE IMPERIAL GROWTH PACKAGE",
        "3-month autonomous campaign | Fixed monthly investment"
    )
    
    # Left: What's included
    included_text = (
        "- Weekly AI-generated ad creatives (10 variants)\n"
        "- Souverain brand localization audit\n"
        "- Meta Ads autonomous optimization\n"
        "- Real-time performance dashboard\n"
        "- Monthly strategic intelligence report\n"
        "- Bill 96 compliance verification\n\n"
        "Deliverable: A self-optimizing growth engine."
    )
    pdf.slide_box(10, 60, 180, 130, "PACKAGE INCLUDES", included_text, (212, 175, 55))
    
    # Right: Investment
    pdf.set_xy(200, 60)
    pdf.set_fill_color(26, 26, 26)
    pdf.rect(200, 60, 87, 130, 'F')
    
    pdf.set_xy(205, 75)
    pdf.set_font('Helvetica', 'I', 10)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(77, 10, "MONTHLY INVESTMENT", 0, 1, 'C')
    
    pdf.set_xy(205, 90)
    pdf.set_font('Helvetica', 'B', 32)
    pdf.set_text_color(212, 175, 55)
    pdf.cell(77, 20, "$3,500", 0, 1, 'C')
    
    pdf.set_xy(205, 115)
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(200, 200, 200)
    pdf.multi_cell(77, 5, "vs. $15K+ for traditional agency\n\n90% of work executed by AI swarm\n10% human oversight and strategy", 0, 'C')
    
    pdf.set_xy(205, 155)
    pdf.set_font('Helvetica', 'B', 11)
    pdf.set_text_color(50, 200, 50)
    pdf.cell(77, 10, "ROI: 3-5x typical", 0, 1, 'C')
    
    # Bottom CTA
    pdf.set_y(200)
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(0, 15, "NEXT STEP: 15-minute Imperial Strategy Call", 0, 1, 'C')
    pdf.set_font('Helvetica', '', 11)
    pdf.cell(0, 8, "Reply to this email or call: +1 (555) 467-3742", 0, 1, 'C')
    
    # Save
    pdf.output(output_name)
    print(f"⚜️ PITCH DECK GENERATED: {output_name}")
    print(f"   Target: {target_name}")
    print(f"   Risk Score: {risk_score}/10")
    print(f"   Value Prop: AI Sovereign Localization")
    return output_name

def batch_generate_pitches():
    """Generate pitches for all Empire targets"""
    print("⚡ 120 OS: BATCH PITCH GENERATION")
    print("="*60)
    
    # Load master data
    try:
        with open('BUTIN_CONTINENTAL_MASTER.json', 'r') as f:
            data = json.load(f)
    except:
        print("❌ Master data not found")
        return
    
    # Extract targets
    targets = []
    for mission in data.get('missions', []):
        for target in mission.get('empire_targets', []):
            targets.append(target)
    
    if not targets:
        print("⚠️  No Empire targets found")
        return
    
    print(f"🎯 Generating {len(targets)} pitch decks...\n")
    
    generated = []
    for target in targets:
        filename = generate_pitch_deck(target)
        generated.append(filename)
    
    print("\n" + "="*60)
    print("✅ BATCH COMPLETE")
    print("="*60)
    print("Generated decks:")
    for g in generated:
        print(f"   • {g}")
    
    return generated

if __name__ == "__main__":
    # Generate for all targets
    batch_generate_pitches()
