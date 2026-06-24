"""
K-PIPA Engine - Korean Personal Information Protection Act Compliance
Validates data residency, consent mechanisms, and retention policies
"""
import json
from datetime import datetime

class KPIPAModel:
    """PIPA (Personal Information Protection Act) compliance validator"""
    
    def __init__(self, company_data):
        self.company = company_data
        self.violations = []
        self.score = 10  # Start perfect, deduct for violations
        
    def check_data_residency(self):
        """Check if personal data is stored in Seoul region"""
        checks = {
            "requirement": "All Korean citizen PII must be stored in Seoul region (or approved domestic cloud)",
            "penalty": "Up to KRW 50M (~$37,000 USD) per violation",
            "items": [
                ("Primary data center in Seoul region", 2),
                ("Backup/replication within Korea", 1),
                ("No cross-border transfer without consent", 2),
                ("Encryption at rest (AES-256 or higher)", 1)
            ]
        }
        
        # Mock check - real implementation would scan infrastructure
        violations = []
        if self.company.get('cloud_provider') in ['AWS Global', 'GCP Global']:
            if not self.company.get('data_residency_configured', False):
                violations.append("Data may be stored outside Seoul region")
                self.score -= 3
        
        return {
            "category": "Data Residency",
            "score_impact": -len(violations) * 2,
            "violations": violations,
            "remediation": "Migrate to Seoul region (AWS ap-northeast-2, Naver Cloud, or KT Cloud)"
        }
    
    def check_explicit_consent(self):
        """Validate explicit consent mechanisms"""
        checks = {
            "requirement": "Explicit opt-in required for AI processing of personal data",
            "penalty": "Up to KRW 30M (~$22,000 USD) + criminal liability for executives",
            "items": [
                ("Granular consent for AI processing", 2),
                ("Separate consent for sensitive data", 2),
                ("Right to withdraw consent (easy process)", 1),
                ("Consent audit trail maintained", 1)
            ]
        }
        
        violations = []
        if not self.company.get('ai_consent_separate', False):
            violations.append("AI processing not separately consented")
            self.score -= 2
        
        if not self.company.get('consent_withdrawal_easy', True):
            violations.append("Consent withdrawal process is burdensome")
            self.score -= 1
            
        return {
            "category": "Explicit Consent",
            "score_impact": -len(violations) * 2,
            "violations": violations,
            "remediation": "Implement granular consent UI and audit logging"
        }
    
    def check_retention_policy(self):
        """Validate data retention and deletion policies"""
        checks = {
            "requirement": "Maximum 3 years retention for most personal data; immediate deletion upon request",
            "penalty": "KRW 10-30M per violation",
            "items": [
                ("Automated deletion after retention period", 2),
                ("User-initiated deletion within 7 days", 2),
                ("Anonymization for analytics retention", 1)
            ]
        }
        
        violations = []
        if self.company.get('retention_years', 0) > 3:
            violations.append(f"Retention period {self.company['retention_years']}y exceeds 3y limit")
            self.score -= 2
            
        return {
            "category": "Data Retention",
            "score_impact": -len(violations) * 2,
            "violations": violations,
            "remediation": "Implement automated data lifecycle management"
        }
    
    def check_third_party_sharing(self):
        """Check third-party data sharing compliance"""
        violations = []
        
        if self.company.get('shares_with_third_parties', False):
            if not self.company.get('third_party_consent_obtained', False):
                violations.append("Third-party sharing without explicit consent")
                self.score -= 3
        
        return {
            "category": "Third-Party Sharing",
            "score_impact": -len(violations) * 3,
            "violations": violations,
            "remediation": "Obtain separate consent for each third-party recipient"
        }
    
    def generate_compliance_report(self):
        """Generate full PIPA compliance report"""
        
        checks = [
            self.check_data_residency(),
            self.check_explicit_consent(),
            self.check_retention_policy(),
            self.check_third_party_sharing()
        ]
        
        # Calculate final score
        final_score = max(0, self.score)
        
        # Determine risk level
        if final_score >= 8:
            risk_level = "LOW"
            action_required = "Maintenance only"
        elif final_score >= 5:
            risk_level = "MEDIUM"
            action_required = "Remediation recommended within 30 days"
        else:
            risk_level = "HIGH"
            action_required = "URGENT: Immediate compliance action required"
        
        # Calculate potential fines
        total_violations = sum(len(c['violations']) for c in checks)
        estimated_fines_krw = total_violations * 20000000  # ~20M per violation avg
        
        report = {
            "generated_at": str(datetime.now()),
            "company": self.company.get('name', 'Unknown'),
            "regulation": "Korean Personal Information Protection Act (PIPA)",
            "compliance_score": final_score,
            "risk_level": risk_level,
            "action_required": action_required,
            "estimated_fines_if_violated_krw": estimated_fines_krw,
            "estimated_fines_usd": estimated_fines_krw * 0.00074,
            "detailed_checks": checks,
            "recommendations": self._generate_recommendations(checks)
        }
        
        return report
    
    def _generate_recommendations(self, checks):
        """Generate actionable recommendations"""
        recs = []
        
        for check in checks:
            if check['violations']:
                recs.append({
                    "category": check['category'],
                    "priority": "HIGH" if check['score_impact'] <= -3 else "MEDIUM",
                    "actions": check['remediation'],
                    "timeline": "30 days" if check['score_impact'] <= -3 else "90 days"
                })
        
        return recs

def main():
    """Demo PIPA analysis"""
    print("⚡ 120 OS: K-PIPA ENGINE")
    print("="*60)
    
    # Example target
    test_company = {
        "name": "TechStartup Korea",
        "cloud_provider": "AWS Global",
        "data_residency_configured": False,
        "ai_consent_separate": False,
        "retention_years": 5,
        "shares_with_third_parties": True,
        "third_party_consent_obtained": False
    }
    
    engine = KPIPAModel(test_company)
    report = engine.generate_compliance_report()
    
    print(f"\nCompany: {report['company']}")
    print(f"PIPA Score: {report['compliance_score']}/10")
    print(f"Risk Level: {report['risk_level']}")
    print(f"Estimated Fines if Violated: ₩{report['estimated_fines_if_violated_krw']:,}")
    print(f"Action Required: {report['action_required']}")
    
    # Save report
    filename = f"K_PIPA_AUDIT_{test_company['name'].replace(' ', '_')}.json"
    with open(filename, 'w') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Report saved: {filename}")

if __name__ == "__main__":
    main()
