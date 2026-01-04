#!/usr/bin/env python3
"""
Fabricator - Clone Cyberhound into niche-specific instances

This script creates customized versions of Cyberhound for different niches
by cloning the repository and configuring it with niche-specific settings.
"""

import os
import sys
import json
import shutil
import subprocess
from pathlib import Path
from typing import Dict, List


class Fabricator:
    """Creates niche-specific instances of Cyberhound"""
    
    def __init__(self, source_repo: str = '.'):
        self.source_repo = Path(source_repo).absolute()
        self.niches = self._load_niches()
    
    def _load_niches(self) -> Dict:
        """Load niche configurations"""
        return {
            'tech': {
                'name': 'TechHound',
                'description': 'Technology and software deals',
                'keywords': ['software', 'tech', 'saas', 'cloud', 'app', 'digital'],
                'sites': [
                    'stacksocial.com',
                    'humblebundle.com',
                    'producthunt.com',
                ],
                'colors': {
                    'primary': '#00d9ff',
                    'secondary': '#9d00ff'
                }
            },
            'gaming': {
                'name': 'GameHound',
                'description': 'Gaming deals and bundles',
                'keywords': ['game', 'gaming', 'steam', 'epic', 'xbox', 'playstation'],
                'sites': [
                    'steampowered.com',
                    'epicgames.com',
                    'humblebundle.com',
                ],
                'colors': {
                    'primary': '#ff00ff',
                    'secondary': '#00ff41'
                }
            },
            'learning': {
                'name': 'LearnHound',
                'description': 'Online course and education deals',
                'keywords': ['course', 'learning', 'education', 'training', 'tutorial'],
                'sites': [
                    'udemy.com',
                    'coursera.org',
                    'skillshare.com',
                ],
                'colors': {
                    'primary': '#00ff41',
                    'secondary': '#00d9ff'
                }
            },
            'shopping': {
                'name': 'ShopHound',
                'description': 'E-commerce and retail deals',
                'keywords': ['sale', 'discount', 'clearance', 'deal', 'offer'],
                'sites': [
                    'amazon.com',
                    'ebay.com',
                    'walmart.com',
                ],
                'colors': {
                    'primary': '#ffff00',
                    'secondary': '#ff00ff'
                }
            }
        }
    
    def fabricate(self, niche: str, target_dir: str) -> bool:
        """
        Create a niche-specific instance
        
        Args:
            niche: Niche identifier (e.g., 'tech', 'gaming')
            target_dir: Target directory for the new instance
            
        Returns:
            True if successful, False otherwise
        """
        if niche not in self.niches:
            print(f"❌ Unknown niche: {niche}")
            print(f"   Available niches: {', '.join(self.niches.keys())}")
            return False
        
        niche_config = self.niches[niche]
        target_path = Path(target_dir).absolute()
        
        print(f"\n🐺 Fabricating {niche_config['name']}...")
        print(f"   Target: {target_path}")
        
        # Step 1: Clone repository
        if not self._clone_repo(target_path):
            return False
        
        # Step 2: Configure for niche
        if not self._configure_niche(target_path, niche, niche_config):
            return False
        
        # Step 3: Create niche-specific configuration files
        if not self._create_config_files(target_path, niche, niche_config):
            return False
        
        print(f"\n✅ {niche_config['name']} fabricated successfully!")
        print(f"   Location: {target_path}")
        print(f"\n   Next steps:")
        print(f"   1. cd {target_path}")
        print(f"   2. Setup Python: cd nose && pip install -r requirements.txt")
        print(f"   3. Setup Proxy: cd proxy && npm install")
        print(f"   4. Setup Face: cd face && npm install")
        print(f"   5. Run the system!")
        
        return True
    
    def _clone_repo(self, target_path: Path) -> bool:
        """Clone the repository"""
        try:
            print("   📦 Cloning repository...")
            
            if target_path.exists():
                print(f"   ⚠️  Target directory already exists: {target_path}")
                response = input("   Overwrite? (yes/no): ")
                if response.lower() != 'yes':
                    return False
                shutil.rmtree(target_path)
            
            # Copy the entire repository
            shutil.copytree(
                self.source_repo,
                target_path,
                ignore=shutil.ignore_patterns(
                    '.git', '__pycache__', 'node_modules', 
                    'venv', 'env', '*.pyc', '.DS_Store',
                    'dist', 'build'
                )
            )
            
            print("   ✓ Repository cloned")
            return True
            
        except Exception as e:
            print(f"   ❌ Clone failed: {str(e)}")
            return False
    
    def _configure_niche(self, target_path: Path, niche: str, config: Dict) -> bool:
        """Configure the instance for the niche"""
        try:
            print(f"   ⚙️  Configuring for {config['name']}...")
            
            # Update README
            readme_path = target_path / 'README.md'
            readme_content = f"""# {config['name']}

{config['description']}

A specialized instance of Cyberhound focused on {niche} deals.

## Features

- Automated deal discovery for {niche}
- AI-powered deal scoring
- Affiliate click tracking
- Cyberpunk-themed dashboard

## Target Sites

{chr(10).join('- ' + site for site in config['sites'])}

## Keywords

{', '.join(config['keywords'])}

## Quick Start

### 1. Setup Nose (Scraper)
```bash
cd nose
pip install -r requirements.txt
python -m playwright install chromium
```

### 2. Setup Proxy (Tracker)
```bash
cd proxy
npm install
npm start
```

### 3. Setup Face (Dashboard)
```bash
cd face
npm install
npm run dev
```

## Configuration

Edit `config.json` to customize scraping targets and behavior.

---

Powered by Cyberhound
"""
            with open(readme_path, 'w') as f:
                f.write(readme_content)
            
            print("   ✓ Configured")
            return True
            
        except Exception as e:
            print(f"   ❌ Configuration failed: {str(e)}")
            return False
    
    def _create_config_files(self, target_path: Path, niche: str, config: Dict) -> bool:
        """Create niche-specific configuration files"""
        try:
            print("   📝 Creating configuration files...")
            
            # Create main config file
            config_data = {
                'niche': niche,
                'name': config['name'],
                'description': config['description'],
                'keywords': config['keywords'],
                'sites': config['sites'],
                'colors': config['colors'],
                'scraping': {
                    'interval_hours': 6,
                    'min_discount': 10,
                    'max_age_days': 7
                },
                'scoring': {
                    'use_vertex_ai': False,
                    'min_score': 40
                },
                'proxy': {
                    'port': 3001,
                    'affiliate_programs': ['amazon', 'ebay']
                },
                'dashboard': {
                    'port': 3000,
                    'refresh_interval': 300
                }
            }
            
            config_path = target_path / 'config.json'
            with open(config_path, 'w') as f:
                json.dump(config_data, f, indent=2)
            
            # Create .env.example
            env_example = f"""# {config['name']} Configuration

# Vertex AI (optional)
VERTEX_PROJECT_ID=your-project-id
VERTEX_LOCATION=us-central1

# Proxy Server
PROXY_PORT=3001
AMAZON_AFFILIATE_ID=your-amazon-id
EBAY_AFFILIATE_ID=your-ebay-id

# Dashboard
VITE_API_URL=http://localhost:3001
"""
            env_path = target_path / '.env.example'
            with open(env_path, 'w') as f:
                f.write(env_example)
            
            print("   ✓ Configuration files created")
            return True
            
        except Exception as e:
            print(f"   ❌ Config file creation failed: {str(e)}")
            return False
    
    def list_niches(self):
        """List available niches"""
        print("\n🐺 Available Niches:\n")
        for niche_id, niche in self.niches.items():
            print(f"   {niche_id:12} - {niche['name']}")
            print(f"   {'':12}   {niche['description']}")
            print()


def main():
    """Main entry point"""
    print("=" * 60)
    print("   CYBERHOUND FABRICATOR v1.0")
    print("   Clone into niche-specific instances")
    print("=" * 60)
    
    if len(sys.argv) < 2:
        print("\nUsage:")
        print("  python fabricator.py list")
        print("  python fabricator.py <niche> <target-directory>")
        print("\nExample:")
        print("  python fabricator.py tech ../TechHound")
        sys.exit(1)
    
    fabricator = Fabricator()
    
    command = sys.argv[1]
    
    if command == 'list':
        fabricator.list_niches()
    else:
        niche = command
        target = sys.argv[2] if len(sys.argv) > 2 else f'../{niche}hound'
        
        success = fabricator.fabricate(niche, target)
        sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
