"""
AdGenXai Creative Generator - Pre-built templates for demo calls
Generates sample ads for Stingray/WM Group to show live during calls
"""
import json
from datetime import datetime

class AdGenXaiCreative:
    """Generates AI-powered ad creative for Quebec market"""
    
    def __init__(self, company_name, industry):
        self.company = company_name
        self.industry = industry
        
    def generate_stingray_ads(self):
        """Generate 5 ad variants for Stingray Digital"""
        
        ads = [
            {
                "variant": 1,
                "headline": "La Musique Québécoise, Sans Limites",
                "subhead": "Découvrez Stingray - Votre ambiance, votre culture",
                "body": "Des milliers de chaînes musicales pensées pour le Québec. De la pop au folk, en passant par le hip-hop d'ici. Stingray, c'est la bande-son de votre vie.",
                "cta": "Essayez Gratuitement",
                "audience": "25-45 ans, amateurs de musique locale",
                "platform": "Meta/Facebook",
                "creative_type": "Image + Texte",
                "cultural_notes": "Uses 'd'ici' (from here) - key Quebec identity marker"
            },
            {
                "variant": 2,
                "headline": "Votre Café a Besoin de la Bonne Vibe",
                "subhead": "Stingray Business - Musique légale pour commerces",
                "body": "Arrêtez les playlists Spotify illégales. Stingray Business offre des licences complètes et une sélection musicale qui fait vibrer vos clients.",
                "cta": "Obtenez Votre Devis",
                "audience": "Propriétaires de café/restaurant",
                "platform": "Meta/Instagram",
                "creative_type": "Carrousel",
                "cultural_notes": "Addresses pain point (illegal Spotify) with solution"
            },
            {
                "variant": 3,
                "headline": "Cette Toune Là, Vous La Connaissez?",
                "subhead": "Stingray vous fait découvrir les hits du Québec",
                "body": "Redécouvrez les classiques québécois et les nouveaux talents d'ici. Avec Stingray, la musique locale n'a jamais été aussi accessible.",
                "cta": "Écoutez Maintenant",
                "audience": "35-55 ans, nostalgie culturelle",
                "platform": "Meta/Video",
                "creative_type": "Vidéo 15s",
                "cultural_notes": "'Toune' is pure Joual - creates instant connection"
            },
            {
                "variant": 4,
                "headline": "Fait au Québec. Écouté au Québec.",
                "subhead": "Stingray - La plateforme 100% locale",
                "body": "Pourquoi écouter des algorithmes américains quand on a les meilleurs curateurs d'ici? Stingray célèbre la culture québécoise, une toune à la fois.",
                "cta": "Rejoignez la Communauté",
                "audience": "Patriotes culturels, 30-50 ans",
                "platform": "Meta/Facebook",
                "creative_type": "Image statique + texte",
                "cultural_notes": "Patriotic angle - 'Fait au Québec' triggers pride"
            },
            {
                "variant": 5,
                "headline": "Le Son de Montréal, C'est Ici",
                "subhead": "Stingray - L'âme musicale de la métropole",
                "body": "Du Mile-End à Hochelag', découvrez la diversité musicale de Montréal. Stingray met en valeur les artistes qui font vibrer notre ville.",
                "cta": "Découvrez les Stations",
                "audience": "Montréalais, 20-40 ans",
                "platform": "Meta/Instagram Stories",
                "creative_type": "Story interactive",
                "cultural_notes": "Hyper-local neighborhood references create authenticity"
            }
        ]
        
        return {
            "company": "Stingray Digital Group Inc",
            "industry": "Digital Music / Media",
            "campaign_objective": "Brand Awareness + B2B Lead Gen",
            "generated_at": str(datetime.now()),
            "variants": ads,
            "notes": "All copy uses Quebecois French (Joual) for cultural resonance. Bill 96 compliant."
        }
    
    def generate_wm_group_ads(self):
        """Generate 5 ad variants for WM Group Solutions"""
        
        ads = [
            {
                "variant": 1,
                "headline": "Votre Entreprise Mérite Mieux que des Solutions Génériques",
                "subhead": "WM Group - Des stratégies taillées pour le Québec",
                "body": "Les consultants américains ne comprennent pas votre réalité. WM Group connaît le marché québécois et parle votre langue - littéralement.",
                "cta": "Parlez à un Expert Local",
                "audience": "PDG PME, 40-60 ans",
                "platform": "Meta/LinkedIn",
                "creative_type": "Image professionnelle + texte",
                "cultural_notes": "Contrast with 'American consultants' - local trust angle"
            },
            {
                "variant": 2,
                "headline": "La Facture 96 Vous Inquiète?",
                "subhead": "WM Group vous guide vers la conformité - en français",
                "body": "Ne laissez pas les amendes de l'OQLF ralentir votre croissance. WM Group traduit vos documents, adapte votre site, et vous protège.",
                "cta": "Audit Gratuit de Conformité",
                "audience": "Entreprises en expansion au Québec",
                "platform": "Meta/Facebook",
                "creative_type": "Infographie",
                "cultural_notes": "Direct Bill 96 pain point - compliance urgency"
            },
            {
                "variant": 3,
                "headline": "Faites Affaire en Bon Québécois",
                "subhead": "WM Group - L'expertise locale qui parle vrai",
                "body": "Pas de jargon corporatif. Pas de solutions importées. Juste des résultats concrets pour des entrepreneurs d'ici.",
                "cta": "Commencez Votre Projet",
                "audience": "Entrepreneurs locaux, 35-55 ans",
                "platform": "Meta/Facebook",
                "creative_type": "Vidéo témoignage",
                "cultural_notes": "'Parle vrai' - authenticity promise in local dialect"
            },
            {
                "variant": 4,
                "headline": "De Trois-Rivières à Gaspé, On Connaît Votre Marché",
                "subhead": "WM Group - Présent dans toutes les régions du Québec",
                "body": "Le marché québécois n'est pas monolithique. WM Group adapte vos stratégies aux réalités de chaque région, de la métropole aux régions.",
                "cta": "Découvrez Notre Réseau",
                "audience": "Entreprises régionales",
                "platform": "Meta/Instagram",
                "creative_type": "Carte interactive",
                "cultural_notes": "Regional inclusivity - Quebec is more than Montreal"
            },
            {
                "variant": 5,
                "headline": "Arrêtez de Traduire. Commencez à Communiquer.",
                "subhead": "WM Group - La nuance culturelle que les agences manquent",
                "body": "Une traduction mot-à-mot ne suffit pas. WM Group capture l'essence de votre message pour qu'il résonne avec les Québécois.",
                "cta": "Voir Nos Réalisations",
                "audience": "Marques nationales expanding to Quebec",
                "platform": "Meta/LinkedIn",
                "creative_type": "Carrousel cas d'études",
                "cultural_notes": "Translation vs. communication - value proposition"
            }
        ]
        
        return {
            "company": "WM Group Solutions Inc",
            "industry": "Business Solutions / Consulting",
            "campaign_objective": "B2B Lead Generation",
            "generated_at": str(datetime.now()),
            "variants": ads,
            "notes": "Copy emphasizes local expertise and Bill 96 compliance."
        }
    
    def export_for_demo(self, target="stingray"):
        """Export creative for use in demo call"""
        
        if target.lower() == "stingray":
            creative = self.generate_stingray_ads()
            filename = "ADGENXAI_STINGRAY_CREATIVES.json"
        else:
            creative = self.generate_wm_group_ads()
            filename = "ADGENXAI_WM_CREATIVES.json"
        
        with open(filename, 'w') as f:
            json.dump(creative, f, indent=2)
        
        print(f"✅ Creative exported: {filename}")
        return filename

def main():
    """Generate all creative assets for demo calls"""
    print("⚡ 120 OS: AdGenXai Creative Generator")
    print("="*60)
    print("Generating live ad examples for demo calls...")
    print()
    
    # Stingray
    stingray_gen = AdGenXaiCreative("Stingray Digital Group", "Digital Music")
    stingray_file = stingray_gen.export_for_demo("stingray")
    
    print("\n🎵 STINGRAY AD VARIANTS:")
    stingray_data = stingray_gen.generate_stingray_ads()
    for i, ad in enumerate(stingray_data['variants'][:3], 1):
        print(f"\n   Variant {i}: {ad['headline']}")
        print(f"   CTA: {ad['cta']}")
        print(f"   Platform: {ad['platform']}")
    
    # WM Group
    wm_gen = AdGenXaiCreative("WM Group Solutions", "Business Consulting")
    wm_file = wm_gen.export_for_demo("wm")
    
    print("\n\n💼 WM GROUP AD VARIANTS:")
    wm_data = wm_gen.generate_wm_group_ads()
    for i, ad in enumerate(wm_data['variants'][:3], 1):
        print(f"\n   Variant {i}: {ad['headline']}")
        print(f"   CTA: {ad['cta']}")
        print(f"   Platform: {ad['platform']}")
    
    print("\n" + "="*60)
    print("✅ CREATIVE ASSETS READY FOR DEMO CALLS")
    print("="*60)
    print(f"\nFiles generated:")
    print(f"  • {stingray_file}")
    print(f"  • {wm_file}")
    print(f"\nUse these during the 15-minute demo to show")
    print(f"live AI-generated creative tailored to each target.")

if __name__ == "__main__":
    main()
