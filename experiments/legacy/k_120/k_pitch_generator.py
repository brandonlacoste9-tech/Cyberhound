"""
K-Pitch Generator - Korean Market Sales Materials
Creates compliance audit reports and retainer proposals for Korean targets
"""
from fpdf import FPDF
import json
from datetime import datetime

class KPitchDeck(FPDF):
    """Korean market pitch deck with cultural localization"""
    
    def __init__(self, company_name):
        super().__init__(orientation='L', unit='mm', format='A4')
        self.company = company_name
        self.set_auto_page_break(auto=False)
        
    def header(self):
        # Korean flag colors inspired header
        self.set_fill_color(20, 40, 80)  # Navy blue
        self.rect(0, 0, 297, 25, 'F')
        
        # Red accent (from Taegeukgi)
        self.set_draw_color(200, 50, 50)
        self.set_line_width(2)
        self.line(10, 25, 287, 25)
        
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(255, 255, 255)
        self.cell(0, 15, 'K-120 AI Compliance Solutions', 0, 0, 'L')
        self.set_font('Helvetica', '', 10)
        self.cell(0, 15, f'기밀 | {self.company}', 0, 0, 'R')

def generate_k_audit_report(target_data):
    """Generate Korean AI Basic Act compliance audit"""
    
    company = target_data.get('name', 'Unknown')
    score = target_data.get('compliance_score', 5)
    msit = target_data.get('msit_status', {})
    
    pdf = KPitchDeck(company)
    
    # Page 1: Executive Summary
    pdf.add_page()
    pdf.set_y(35)
    pdf.set_font('Helvetica', 'B', 24)
    pdf.set_text_color(200, 50, 50)  # Korean red
    pdf.cell(0, 15, f'AI 기본법 (AI Basic Act) Compliance Audit', 0, 1, 'C')
    
    pdf.set_font('Helvetica', '', 12)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 10, f'기업: {company} | 평가일: {datetime.now().strftime("%Y-%m-%d")}', 0, 1, 'C')
    pdf.ln(10)
    
    # Risk score box
    pdf.set_fill_color(245, 245, 245)
    pdf.rect(50, 70, 197, 50, 'F')
    
    pdf.set_xy(60, 80)
    pdf.set_font('Helvetica', 'B', 16)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(0, 10, f'Compliance Risk Score: {score}/10', 0, 1)
    
    pdf.set_xy(60, 95)
    pdf.set_font('Helvetica', '', 11)
    if score >= 7:
        risk_text = "HIGH RISK - Immediate MSIT action required"
        pdf.set_text_color(200, 50, 50)
    elif score >= 4:
        risk_text = "MEDIUM RISK - Remediation recommended"
        pdf.set_text_color(200, 150, 50)
    else:
        risk_text = "LOW RISK - Maintenance mode"
        pdf.set_textColor(50, 150, 50)
    
    pdf.cell(0, 10, risk_text, 0, 1)
    
    # MSIT Status
    pdf.ln(15)
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(0, 10, 'MSIT (과학기술정보통신부) Registration Status', 0, 1)
    
    pdf.set_font('Helvetica', '', 11)
    if msit.get('required', False):
        pdf.set_text_color(200, 50, 50)
        pdf.multi_cell(0, 8, f"⚠️  REQUIRED: Your AI systems require MSIT pre-approval before operation.\n"
                            f"Reasons: {', '.join(msit.get('reasons', []))}\n"
                            f"Timeline: {msit.get('timeline', 'N/A')}\n"
                            f"Penalty: {msit.get('penalty', 'KRW 30M')}")
    else:
        pdf.set_text_color(50, 150, 50)
        pdf.cell(0, 10, "✓ MSIT registration not required for current AI systems", 0, 1)
    
    # Page 2: The 8 Pillars
    pdf.add_page()
    pdf.set_y(35)
    pdf.set_font('Helvetica', 'B', 20)
    pdf.set_text_color(20, 40, 80)
    pdf.cell(0, 15, 'The 8 Pillars of Korean AI Basic Act Compliance', 0, 1, 'C')
    pdf.ln(5)
    
    pillars = [
        ("1. 사용자 알림 (User Notification)", "Mandate advance notice of AI use to all users"),
        ("2. 인간 감독 (Human Oversight)", "Mechanisms for human override in AI decisions"),
        ("3. 위험 관리 (Risk Management)", "Automated risk scoring and mitigation systems"),
        ("4. 기록 보관 (Documentation)", "3-year audit trails for all AI processing"),
        ("5. 명시적 동의 (Explicit Consent)", "Separate opt-in for AI data processing"),
        ("6. 데이터 거주 (Data Residency)", "All PII must remain in Seoul region"),
        ("7. MSIT 등록 (MSIT Registration)", "Pre-approval for high-risk AI systems"),
        ("8. 권리 보장 (Rights Protection)", "User rights to explanation and deletion")
    ]
    
    y_pos = 60
    for title, desc in pillars:
        pdf.set_xy(20, y_pos)
        pdf.set_font('Helvetica', 'B', 11)
        pdf.set_text_color(20, 40, 80)
        pdf.cell(0, 8, title, 0, 1)
        
        pdf.set_xy(20, y_pos + 8)
        pdf.set_font('Helvetica', '', 10)
        pdf.set_text_color(80, 80, 80)
        pdf.cell(0, 6, desc, 0, 1)
        y_pos += 20
    
    # Page 3: The Offer
    pdf.add_page()
    pdf.set_y(35)
    pdf.set_font('Helvetica', 'B', 22)
    pdf.set_text_color(200, 50, 50)
    pdf.cell(0, 15, 'K-120 Compliance Solutions', 0, 1, 'C')
    
    pdf.set_font('Helvetica', 'I', 12)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 10, 'AI Basic Act & PIPA Compliance for Korean Enterprises', 0, 1, 'C')
    pdf.ln(10)
    
    # Package box
    pdf.set_fill_color(245, 245, 245)
    pdf.rect(30, 70, 237, 100, 'F')
    
    pdf.set_xy(40, 80)
    pdf.set_font('Helvetica', 'B', 16)
    pdf.set_text_color(20, 40, 80)
    pdf.cell(0, 10, 'K-Safety Audit + MSIT Registration Support', 0, 1)
    
    services = [
        "✓ Complete AI Basic Act gap analysis",
        "✓ PIPA data residency audit",
        "✓ MSIT pre-approval documentation",
        "✓ 3-year audit trail framework",
        "✓ Korean-language compliance templates",
        "✓ Ongoing regulatory monitoring"
    ]
    
    pdf.set_xy(40, 95)
    pdf.set_font('Helvetica', '', 11)
    pdf.set_text_color(60, 60, 60)
    for service in services:
        pdf.cell(0, 8, service, 0, 1)
        pdf.set_x(40)
    
    # Pricing
    pdf.set_xy(180, 80)
    pdf.set_fill_color(20, 40, 80)
    pdf.rect(180, 80, 77, 80, 'F')
    
    pdf.set_xy(185, 90)
    pdf.set_font('Helvetica', 'I', 10)
    pdf.set_text_color(200, 200, 200)
    pdf.cell(67, 10, '투자금액 (Investment)', 0, 1, 'C')
    
    pdf.set_xy(185, 105)
    pdf.set_font('Helvetica', 'B', 28)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(67, 20, '₩1,000,000', 0, 1, 'C')
    
    pdf.set_xy(185, 130)
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(200, 200, 200)
    pdf.cell(67, 10, '~$750 USD', 0, 1, 'C')
    
    pdf.set_xy(185, 145)
    pdf.set_font('Helvetica', 'B', 11)
    pdf.set_text_color(100, 255, 100)
    pdf.cell(67, 10, 'vs ₩30M penalty', 0, 1, 'C')
    
    # CTA
    pdf.set_y(180)
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(0, 15, 'Next Step: 15-Minute Compliance Strategy Call', 0, 1, 'C')
    pdf.set_font('Helvetica', '', 11)
    pdf.cell(0, 8, 'Email: reply to this document | Call: +82 (02) XXX-XXXX', 0, 1, 'C')
    
    filename = f"K_AUDIT_{company.replace(' ', '_')}.pdf"
    pdf.output(filename)
    return filename

def main():
    """Generate sample Korean audit"""
    print("⚡ 120 OS: K-PITCH GENERATOR")
    print("="*60)
    
    test_target = {
        "name": "Toss Bank",
        "compliance_score": 9,
        "msit_status": {
            "required": True,
            "reasons": ["AI Credit Scoring", "Sector: Fintech"],
            "timeline": "30-60 days",
            "penalty": "Up to KRW 30M + suspension"
        }
    }
    
    filename = generate_k_audit_report(test_target)
    print(f"✅ K-Audit generated: {filename}")
    print(f"   Target: {test_target['name']}")
    print(f"   Risk: {test_target['compliance_score']}/10")
    print(f"   MSIT: REQUIRED")

if __name__ == "__main__":
    main()
