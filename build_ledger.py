from fpdf import FPDF
import json
import datetime

class ImperialPDF(FPDF):
    def header(self):
        self.set_fill_color(30, 30, 30) # Dark Leather
        self.rect(0, 0, 210, 40, 'F')
        self.set_font('Arial', 'B', 24)
        self.set_text_color(212, 175, 55) # Gold
        self.cell(0, 20, 'SOUVERAIN VENTURE LEDGER', 0, 1, 'C')
        self.set_font('Arial', 'I', 10)
        self.cell(0, -5, f'Generated: {datetime.date.today()}', 0, 1, 'C')
        self.ln(20)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(100)
        self.cell(0, 10, 'Propriété de Northern Ventures - Confidential Imperial Document', 0, 0, 'C')

def create_ledger():
    pdf = ImperialPDF()
    pdf.add_page()
    
    # Load the Master Butin
    try:
        with open('BUTIN_CONTINENTAL_MASTER.json', 'r') as f:
            data = json.load(f)
    except:
        print("❌ Master Butin not found. Run the scout first!")
        return

    pdf.set_font('Arial', 'B', 16)
    pdf.set_text_color(50, 50, 50)
    pdf.cell(0, 10, 'HIGH-PRIORITY TARGETS (BILL 96 VULNERABILITY)', 0, 1)
    pdf.ln(5)

    # Extract all targets from missions
    all_targets = []
    for mission in data.get('missions', []):
        for target in mission.get('empire_targets', []):
            all_targets.append(target)
    
    if not all_targets:
        pdf.set_font('Arial', '', 12)
        pdf.cell(0, 10, 'No high-priority targets identified in this sweep.', 0, 1)
    
    for target in all_targets:
        pdf.set_font('Arial', 'B', 12)
        pdf.set_fill_color(240, 240, 240)
        pdf.cell(0, 10, f" TARGET: {target['name']}", 1, 1, 'L', True)
        
        pdf.set_font('Arial', '', 10)
        pdf.cell(0, 8, f"Sector: {target.get('city', 'Unknown')} | Risk Score: {target.get('english_only_risk', 'N/A')}/10", 0, 1)
        pdf.set_text_color(150, 0, 0)
        pdf.multi_cell(0, 8, f"Analysis: Business is currently operating under an English-only trade name. High risk of Office québécois de la langue française (OQLF) intervention.")
        pdf.set_text_color(0, 100, 0)
        
        # Proposed French rebrand
        french_name = target['name'].replace('Group', 'Groupe').replace('Digital', 'Numérique').replace('Inc', 'Inc.').replace('Ltd', 'Ltée')
        pdf.cell(0, 8, f"Recommendation: Pivot to 'Souverain' branding. Proposed: {french_name}", 0, 1)
        pdf.set_text_color(0, 0, 0)
        pdf.ln(5)
    
    # Add summary section
    pdf.add_page()
    pdf.set_font('Arial', 'B', 16)
    pdf.set_text_color(50, 50, 50)
    pdf.cell(0, 10, 'OPERATION SUMMARY', 0, 1)
    pdf.ln(5)
    
    pdf.set_font('Arial', '', 11)
    pdf.cell(0, 8, f"Total Cities Swept: {data.get('total_leads', 0)}", 0, 1)
    pdf.cell(0, 8, f"Total Leads Captured: {data.get('total_leads', 0)}", 0, 1)
    pdf.cell(0, 8, f"Empire Targets Identified: {data.get('total_targets', 0)}", 0, 1)
    pdf.cell(0, 8, f"Mission Timestamp: {data.get('timestamp', 'Unknown')}", 0, 1)
    pdf.ln(10)
    
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, 'Souverain Strategy', 0, 1)
    pdf.set_font('Arial', '', 10)
    pdf.multi_cell(0, 6, "The identified targets represent high-value opportunities for French localization services. Under Bill 96, businesses with English-only branding face increasing scrutiny in Quebec.")

    pdf.output('IMPERIAL_VENTURE_LEDGER.pdf')
    print("⚜️ LEDGER MANIFESTED: Check ~/IronClaw/IMPERIAL_VENTURE_LEDGER.pdf")

if __name__ == "__main__":
    create_ledger()
