"""
Article 34 Risk Report Generator
Creates detailed MSIT compliance reports for high-risk Korean targets
"""
import json
from datetime import datetime
from fpdf import FPDF

class Article34RiskReport(FPDF):
    """MSIT-compliant risk assessment report"""
    
    def __init__(self, company_name):
        super().__init__()
        self.company = company_name
        self.set_auto_page_break(auto=True, margin=15)
        
    def header(self):
        self.set_fill_color(20, 40, 80)
        self.rect(0, 0, 210, 30, 'F')
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(255, 255, 255)
        self.cell(0, 20, f'Article 34 Risk Assessment: {self.company}', 0, 0, 'C')
        self.ln(25)

def generate_article_34_report(target_data):
    """Generate comprehensive Article 34 compliance report"""
    
    company = target_data.get('name', 'Unknown')
    pdf = Article34RiskReport(company)
    
    # Page 1: Executive Summary
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_text_color(200, 50, 50)
    pdf.cell(0, 10, 'EXECUTIVE SUMMARY', 0, 1)
    
    pdf.set_font('Helvetica', '', 11)
    pdf.set_text_color(50, 50, 50)
    
    risk_level = target_data.get('compliance_score', 5)
    msit_required = target_data.get('msit_status', {}).get('required', False)
    
    summary_text = f"""
Company: {company}
Assessment Date: {datetime.now().strftime('%Y-%m-%d')}
Overall Risk Score: {risk_level}/10

REGULATORY STATUS:
{"⚠️  HIGH-RISK: MSIT Pre-Approval REQUIRED" if msit_required else "✓ Standard Compliance Track"}

This assessment identifies specific violations of the Korean AI Basic Act 
(Article 34) and provides remediation steps to achieve compliance before 
the January 22, 2026 enforcement deadline.
"""
    
    pdf.multi_cell(0, 6, summary_text)
    pdf.ln(10)
    
    # Article 34 Requirements
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(20, 40, 80)
    pdf.cell(0, 10, 'ARTICLE 34 HIGH-RISK AI SYSTEMS', 0, 1)
    
    article_34_systems = [
        ("AI Credit Scoring", "Financial risk assessment using algorithms"),
        ("AI Recruitment", "Automated hiring or promotion decisions"),
        ("AI Medical Diagnosis", "Healthcare screening or diagnosis"),
        ("AI Education Assessment", "Automated grading or admissions"),
        ("AI Biometric Recognition", "Facial/voice recognition systems"),
        ("AI Autonomous Systems", "Self-driving or automated control"),
        ("AI Public Surveillance", "Mass monitoring or tracking")
    ]
    
    detected_systems = target_data.get('ai_systems', [])
    
    pdf.set_font('Helvetica', '', 10)
    for system, description in article_34_systems:
        is_detected = any(system.lower() in s.lower() for s in detected_systems)
        status = "⚠️  DETECTED" if is_detected else "✓ Not Applicable"
        pdf.cell(0, 6, f"{system}: {status}", 0, 1)
    
    # Page 2: Specific Violations
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_text_color(200, 50, 50)
    pdf.cell(0, 10, 'IDENTIFIED COMPLIANCE GAPS', 0, 1)
    pdf.ln(5)
    
    gaps = target_data.get('compliance_gaps', [])
    
    gap_details = {
        "data_residency": {
            "title": "Data Residency Violation (PIPA)",
            "issue": "Personal data stored outside Seoul region",
            "penalty": "Up to KRW 50M per violation",
            "remediation": "Migrate to AWS ap-northeast-2 or Naver Cloud"
        },
        "audit_logs": {
            "title": "Incomplete Audit Trail",
            "issue": "3-year audit log requirement not met",
            "penalty": "KRW 10-30M",
            "remediation": "Implement automated logging infrastructure"
        },
        "msit_registration": {
            "title": "Missing MSIT Pre-Approval",
            "issue": "High-risk AI system operating without registration",
            "penalty": "Operational suspension + KRW 30M",
            "remediation": "File MSIT Form AI-2026 within 30 days"
        },
        "consent_mechanism": {
            "title": "Insufficient Consent Framework",
            "issue": "Explicit AI processing consent not obtained",
            "penalty": "KRW 10-20M",
            "remediation": "Implement granular consent UI"
        },
        "human_oversight": {
            "title": "Inadequate Human Oversight",
            "issue": "No human override mechanism for AI decisions",
            "penalty": "KRW 10-30M",
            "remediation": "Deploy human-in-the-loop system"
        }
    }
    
    for gap in gaps:
        if gap in gap_details:
            details = gap_details[gap]
            pdf.set_font('Helvetica', 'B', 11)
            pdf.set_text_color(200, 50, 50)
            pdf.cell(0, 8, f"⚠️  {details['title']}", 0, 1)
            
            pdf.set_font('Helvetica', '', 10)
            pdf.set_text_color(50, 50, 50)
            pdf.cell(0, 6, f"Issue: {details['issue']}", 0, 1)
            pdf.cell(0, 6, f"Penalty: {details['penalty']}", 0, 1)
            pdf.set_text_color(50, 150, 50)
            pdf.cell(0, 6, f"Fix: {details['remediation']}", 0, 1)
            pdf.ln(5)
    
    # Page 3: Remediation Roadmap
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_text_color(20, 40, 80)
    pdf.cell(0, 10, '90-DAY COMPLIANCE ROADMAP', 0, 1)
    pdf.ln(5)
    
    roadmap = [
        ("Days 1-7", "Emergency Gap Assessment", "K-120 Rapid Scan"),
        ("Days 8-14", "MSIT Pre-Application", "File AI-2026 Form"),
        ("Days 15-30", "Data Residency Migration", "Seoul Region Setup"),
        ("Days 31-60", "Audit Infrastructure", "3-Year Logging Deployed"),
        ("Days 61-90", "Compliance Certification", "MSIT Final Approval")
    ]
    
    for period, task, deliverable in roadmap:
        pdf.set_font('Helvetica', 'B', 10)
        pdf.set_text_color(20, 40, 80)
        pdf.cell(40, 8, period, 0, 0)
        
        pdf.set_font('Helvetica', 'B', 10)
        pdf.set_text_color(50, 50, 50)
        pdf.cell(70, 8, task, 0, 0)
        
        pdf.set_font('Helvetica', '', 10)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(80, 8, deliverable, 0, 1)
        
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)
    
    pdf.ln(10)
    
    # Investment Section
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_text_color(20, 40, 80)
    pdf.cell(0, 10, 'COMPLIANCE INVESTMENT', 0, 1)
    
    pdf.set_fill_color(245, 245, 245)
    pdf.rect(10, pdf.get_y(), 190, 50, 'F')
    
    pdf.set_xy(20, pdf.get_y() + 10)
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(200, 50, 50)
    pdf.cell(0, 10, f'DIY Cost: KRW {len(gaps) * 20000000:,} (penalties only)', 0, 1)
    
    pdf.set_x(20)
    pdf.set_text_color(50, 150, 50)
    pdf.cell(0, 10, 'K-120 Solution: KRW 1,000,000 (audit) + KRW 5,000,000/mo', 0, 1)
    
    pdf.set_x(20)
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 10, 'ROI: Avoid 20x penalty cost + maintain operations', 0, 1)
    
    filename = f"ARTICLE34_REPORT_{company.replace(' ', '_').upper()}.pdf"
    pdf.output(filename)
    return filename

def batch_generate_reports():
    """Generate Article 34 reports for all high-risk targets"""
    
    # Load targets from K120 database
    try:
        with open('K120_TARGETS_20260227.json', 'r') as f:
            data = json.load(f)
    except:
        print("❌ No target database found. Run k_ghost_hound.py first.")
        return
    
    print("⚡ 120 OS: ARTICLE 34 RISK REPORT GENERATOR")
    print("="*60)
    
    high_risk = [t for t in data.get('targets', []) if t.get('compliance_score', 0) >= 7]
    
    print(f"🎯 Generating reports for {len(high_risk)} high-risk targets...\n")
    
    generated = []
    for target in high_risk:
        filename = generate_article_34_report(target)
        generated.append(filename)
        print(f"✅ {filename}")
    
    print("\n" + "="*60)
    print("✅ ALL ARTICLE 34 REPORTS GENERATED")
    print("="*60)
    print("\nThese reports are ready to attach to sales emails.")
    print("Each report includes:")
    print("  • Specific Article 34 violations detected")
    print("  • Exact penalty amounts")
    print("  • 90-day remediation roadmap")
    print("  • K-120 solution pricing")
    
    return generated

if __name__ == "__main__":
    batch_generate_reports()
