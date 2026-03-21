import json

def generate_strike_email(lead):
    company_id = lead['hound_id']
    audit = lead['souverain_audit']
    
    email_body = f"""
Objet : Audit de Souveraineté Numérique - {company_id}

Bonjour,

Nous avons complété un audit préliminaire de votre infrastructure numérique suite à votre récent enregistrement. 

Nos Cyber-Hounds ont identifié des points critiques pour votre premier trimestre :
- Conformité Loi 96 : {audit['bill_96_status']}
- État Technologique : {audit['tech_stack']}
- Potentiel d'Optimisation : {audit['optimization_potential']}

Vecteur d'intervention suggéré : {audit['pitch_vector']}

Northern Ventures peut stabiliser ces paramètres avant votre phase de croissance. Souhaitez-vous recevoir le rapport complet de 5 pages ?

Cordialement,

Kimmy Claw
Directrice de la Diplomatie, Northern Ventures
"""
    return {"target": company_id, "strike_payload": email_body}

def prepare_dispatch():
    with open('AUDIT_LOG.json', 'r') as f:
        audits = json.load(f)
    
    print(f"✉️ Preparing First Strike for {len(audits)} targets...")
    dispatch_list = [generate_strike_email(a) for a in audits]
    
    with open('STRIKE_LIST.json', 'w') as f:
        json.dump(dispatch_list, f, indent=4)
    print("🔥 STRIKE_LIST.json generated. Ready for 08:00 EST deployment.")

if __name__ == "__main__":
    prepare_dispatch()
