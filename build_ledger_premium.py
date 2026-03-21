from fpdf import FPDF
import json
import datetime

class PremiumImperialPDF(FPDF):
    def header(self):
        # Imperial Header: Dark Leather Background
        self.set_fill_color(26, 26, 26)
        self.rect(0, 0, 210, 50, 'F')
        
        # Gold Border
        self.set_draw_color(212, 175, 55)
        self.set_line_width(1.5)
        self.line(10, 45, 200, 45)
        
        # Title
        self.set_font('Helvetica', 'B', 28)
        self.set_text_color(212, 175, 55)
        self.cell(0, 30, 'NORTHERN VENTURES', 0, 1, 'C')
        self.set_font('Helvetica', 'I', 12)
        self.cell(0, -10, 'Souverain Venture Intelligence Ledger', 0, 1, 'C')
        self.ln(30)

    def footer(self):
        self.set_y(-20)
        self.set_font('Helvetica', 'I', 9)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f'CONFIDENTIAL - {datetime.date.today()} - Page {self.page_no()}', 0, 0, 'C')

def forge_ledger():
    pdf = PremiumImperialPDF()
    pdf.add_page()
    
    # Load data
    try:
        with open('BUTIN_CONTINENTAL_MASTER.json', 'r') as f:
            master_data = json.load(f)
    except:
        print("❌ Master data not found. Run scout first.")
        return
    
    # Executive Summary Section
    pdf.set_font('Helvetica', 'B', 16)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(0, 10, 'I. STRATEGIC MISSION', 0, 1, 'L')
    pdf.set_font('Helvetica', '', 11)
    pdf.multi_cell(0, 7, "The Bee Swarm Empire identifies high-potential enterprises for aesthetic and linguistic evolution. We bridge the gap between English-only operations and the Quebecois 'Souverain' market through precision branding and Bill 96 compliance automation.")
    pdf.ln(10)

    # Lead Table Header
    pdf.set_font('Helvetica', 'B', 14)
    pdf.cell(0, 10, 'II. HIGH-PRIORITY TARGETS (MONTREAL SECTOR)', 0, 1, 'L')
    pdf.ln(5)
    
    # Extract empire targets from missions
    empire_targets = []
    for mission in master_data.get('missions', []):
        for target in mission.get('empire_targets', []):
            empire_targets.append(target)
    
    if not empire_targets:
        pdf.set_font('Helvetica', '', 11)
        pdf.cell(0, 10, "No high-priority targets identified in this sweep.", 0, 1)
    
    for target in empire_targets:
        pdf.set_font('Helvetica', 'B', 12)
        pdf.set_fill_color(245, 245, 245)
        pdf.cell(0, 10, f" > TARGET: {target['name'].upper()}", 1, 1, 'L', True)
        
        pdf.set_font('Helvetica', '', 10)
        pdf.set_text_color(200, 0, 0)
        risk = target.get('english_only_risk', 'N/A')
        pdf.cell(0, 8, f"   Risk Assessment: {risk}/10 (Critical Compliance Threshold)", 0, 1)
        pdf.set_text_color(0, 102, 51)
        
        # Proposed rebrand
        french_name = target['name'].replace('Digital', 'Numérique').replace('Group', 'Groupe').replace('Inc', 'Inc.').replace('Ltd', 'Ltée')
        pdf.cell(0, 8, f"   Proposed Identity: {french_name}", 0, 1)
        pdf.ln(5)

    # Add summary section
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 16)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(0, 10, 'III. OPERATION SUMMARY', 0, 1, 'L')
    pdf.ln(5)
    
    pdf.set_font('Helvetica', '', 11)
    summary_text = (
        f"Cities Analyzed: {len(master_data.get('missions', []))}\n"
        f"Total Leads Assessed: {master_data.get('total_leads', 0)}\n"
        f"Empire Targets Identified: {master_data.get('total_targets', 0)}\n"
        f"Mission Date: {master_data.get('timestamp', 'Unknown')[:10]}\n\n"
        "These targets represent immediate opportunities for 'Souverain' rebranding services, "
        "positioning Northern Ventures as the premier solution for Bill 96 compliance."
    )
    pdf.multi_cell(0, 7, summary_text)

    pdf.output('IMPERIAL_PREMIUM_LEDGER.pdf')
    print("⚜️ PREMIUM LEDGER FORGED")
    print("📄 File: ~/IronClaw/IMPERIAL_PREMIUM_LEDGER.pdf")

if __name__ == "__main__":
    forge_ledger()
