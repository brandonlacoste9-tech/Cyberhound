"""
K-Email Envoy - Korean Market Strike System
Sends compliance audits with bridge to Korean SaaS platform
"""
import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime

# SaaS Platform Bridge URL
# IMPORTANT: Update this URL after deploying Korean SaaS
# Get URL from: github.com/brandonlacoste9-tech/Korean-basic-AI-act-
KOREAN_SAAS_URL = os.environ.get('KOREAN_SAAS_URL', 'https://YOUR-DEPLOYMENT-URL.vercel.app')

def send_k_strike(target_email, company_name, risk_score, compliance_gaps):
    """Send Korean compliance strike with SaaS bridge"""
    
    # Load credentials from environment
    smtp_user = os.environ.get('SMTP_USER')
    smtp_pass = os.environ.get('SMTP_PASS')
    
    if not smtp_user or not smtp_pass:
        print("❌ Credentials not configured. Set SMTP_USER and SMTP_PASS")
        return False
    
    print(f"🚀 K-120: STRIKING {company_name.upper()}")
    print(f"   Target: {target_email}")
    print(f"   Risk Score: {risk_score}/10")
    print(f"   Bridge: {KOREAN_SAAS_URL}")
    
    # Create message
    msg = MIMEMultipart()
    msg['From'] = f"K-120 AI Compliance <{smtp_user}>"
    msg['To'] = target_email
    msg['Subject'] = f"[긴급] AI 기본법 준수 필요 - {company_name} (위험도: {risk_score}/10)"
    
    # Korean email body with bridge
    body = f"""안녕하세요 {company_name} 담당자님,

귀사의 AI 시스템이 한국 AI 기본법(AI Basic Act) 위반 가능성이 확인되었습니다.

⚠️ 위험 분석 결과:
• 위험도: {risk_score}/10 ({"높음" if risk_score >= 7 else "중간" if risk_score >= 4 else "낮음"})
• 준수 항목: {', '.join(compliance_gaps)}
• 벌금 위험: 최대 3천만원 (KRW 30,000,000)

🔍 물론 확인:
아래 링크에서 물론 AI 준수 진단을 받아보세요:
{KOREAN_SAAS_URL}/check

3분이면 귀사의 AI 시스템 위험도를 정확히 파악할 수 있습니다.

💼 해결책:
K-120이 제공하는 종합 준수 패키지:
• AI 기본법 갭 분석
• PIPA 데이터 거주 분석  
• MSIT 사전 승인 지원
• 3년 감사 추적 프레임워크

투자금액: ₩1,000,000 (일회성 진단)
월간 관리: ₩5,000,000/월 (자동화된 준수 관리)

⏰ 시급성:
2026년 1월 22일 AI 기본법 시행 이후 위반 시 영업정지 가능성이 있습니다.

📞 다음 단계:
이 이메일에 회신하거나 상담 전화를 주세요.

감사합니다,
K-120 AI Compliance Team
"""
    
    msg.attach(MIMEText(body, 'plain'))
    
    # Generate and attach audit PDF
    try:
        # Import the K-pitch generator
        from k_pitch_generator import generate_k_audit_report
        
        target_data = {
            "name": company_name,
            "compliance_score": risk_score,
            "msit_status": {
                "required": risk_score >= 7,
                "reasons": compliance_gaps
            }
        }
        
        pdf_filename = generate_k_audit_report(target_data)
        
        with open(pdf_filename, "rb") as attachment:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment.read())
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f"attachment; filename= {pdf_filename}"
            )
            msg.attach(part)
            print(f"   📎 Attached: {pdf_filename}")
            
    except Exception as e:
        print(f"   ⚠️  PDF generation failed: {e}")
    
    # Send email
    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ K-STRIKE DELIVERED: {company_name}")
        print(f"   Bridge URL included: {KOREAN_SAAS_URL}")
        return True
        
    except Exception as e:
        print(f"❌ Strike failed: {e}")
        return False

def strike_toss_bank():
    """Pre-configured strike on Toss Bank"""
    return send_k_strike(
        target_email="compliance@toss.im",  # Update with real email
        company_name="Toss Bank",
        risk_score=8,
        compliance_gaps=["AI Credit Scoring", "MSIT Registration Required", "Data Residency"]
    )

def strike_riid():
    """Pre-configured strike on Riiid"""
    return send_k_strike(
        target_email="contact@riiid.co",  # Update with real email
        company_name="Riiid",
        risk_score=8,
        compliance_gaps=["Education AI Assessment", "MSIT Registration Required", "Algorithm Transparency"]
    )

def strike_vuno():
    """Pre-configured strike on Vuno"""
    return send_k_strike(
        target_email="info@vuno.co",  # Update with real email
        company_name="Vuno",
        risk_score=8,
        compliance_gaps=["Medical AI", "Clinical Validation", "MSIT Registration Required"]
    )

def batch_k_strike():
    """Strike all high-risk Korean targets"""
    print("⚡ 120 OS: K-BATCH STRIKE INITIATED")
    print("="*60)
    print(f"Bridge URL: {KOREAN_SAAS_URL}")
    print("="*60)
    
    results = []
    
    # Strike high-risk targets
    targets = [
        ("Toss Bank", strike_toss_bank),
        ("Riiid", strike_riid),
        ("Vuno", strike_vuno)
    ]
    
    for name, strike_func in targets:
        print(f"\n🎯 {name}")
        result = strike_func()
        results.append({"target": name, "success": result})
        
        if result:
            print(f"   ✅ Strike successful")
        else:
            print(f"   ❌ Strike failed")
    
    # Log results
    log_entry = {
        "timestamp": str(datetime.now()),
        "operation": "k_batch_strike",
        "bridge_url": KOREAN_SAAS_URL,
        "results": results
    }
    
    with open("K_STRIKE_LOG.json", "w") as f:
        json.dump(log_entry, f, indent=2)
    
    print("\n" + "="*60)
    print("✅ K-BATCH STRIKE COMPLETE")
    print(f"Log saved: K_STRIKE_LOG.json")
    
    return results

if __name__ == "__main__":
    import json
    
    print("⚡ K-120 EMAIL ENVOY")
    print("="*60)
    print("\nAvailable strikes:")
    print("  1. strike_toss_bank()")
    print("  2. strike_riid()")
    print("  3. strike_vuno()")
    print("  4. batch_k_strike() - All high-risk targets")
    print()
    print(f"Bridge URL: {KOREAN_SAAS_URL}")
    print("\nUpdate KOREAN_SAAS_URL with your actual deployment URL")
