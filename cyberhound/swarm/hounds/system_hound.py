"""
SystemHound - Agent for monitoring and repairing system health
"""

import asyncio
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from .base_hound import BaseHound


class SystemHound(BaseHound):
    """
    The System Repair Specialist
    
    Monitors:
    - Project health (env vars, configs)
    - Build status
    - Dependencies
    - Git status
    
    Repairs:
    - Missing env files
    - Broken dependencies
    - Configuration issues
    """
    
    def __init__(self, config: Dict = None):
        config = config or {}
        super().__init__(
            name="SystemHound",
            category="maintenance",
            config=config
        )
        self.projects = config.get('projects', [
            'Vraie-Quebec',
            'lambiance',
            'ouichat-repo',
            'ZyeuteV5'
        ])
        self.issues_found: List[Dict] = []
        self.issues_fixed: List[Dict] = []
        
    async def hunt(self, filters: Optional[Dict] = None) -> List[Dict]:
        """
        Hunt for system issues across all projects
        
        Returns list of issues found (and optionally fixed)
        """
        self.status = "HUNTING"
        self.last_hunt = datetime.now()
        self.issues_found = []
        self.issues_fixed = []
        
        for project in self.projects:
            project_path = Path.home() / project
            
            if not project_path.exists():
                self.issues_found.append({
                    'project': project,
                    'type': 'missing',
                    'severity': 'critical',
                    'description': f'Project not found at {project_path}',
                    'auto_fixable': False
                })
                continue
            
            # Check various issues
            await self._check_env_file(project, project_path)
            await self._check_node_modules(project, project_path)
            await self._check_git_status(project, project_path)
            await self._check_build_config(project, project_path)
        
        # Attempt auto-fixes if enabled
        auto_fix = filters.get('auto_fix', False) if filters else False
        if auto_fix:
            await self._auto_fix()
        
        self.bounties_found = len(self.issues_found)
        self.status = "RESTING"
        
        return self.issues_found
    
    async def _check_env_file(self, project: str, path: Path):
        """Check for missing env file"""
        env_local = path / '.env.local'
        env_file = path / '.env'
        
        if not env_local.exists() and not env_file.exists():
            self.issues_found.append({
                'project': project,
                'type': 'missing_env',
                'severity': 'high',
                'description': 'No .env.local or .env file found',
                'auto_fixable': True,
                'fix_action': 'create_env_template'
            })
        elif env_local.exists():
            # Check if empty or missing critical vars
            content = env_local.read_text()
            critical_vars = ['SUPABASE_URL', 'DATABASE_URL', 'API_KEY']
            missing = [v for v in critical_vars if v not in content]
            
            if missing:
                self.issues_found.append({
                    'project': project,
                    'type': 'incomplete_env',
                    'severity': 'medium',
                    'description': f'Missing env vars: {", ".join(missing)}',
                    'auto_fixable': False
                })
    
    async def _check_node_modules(self, project: str, path: Path):
        """Check for missing/corrupted node_modules"""
        nm_path = path / 'node_modules'
        pkg_path = path / 'package.json'
        
        if not pkg_path.exists():
            return  # Not a Node project
        
        if not nm_path.exists():
            self.issues_found.append({
                'project': project,
                'type': 'missing_node_modules',
                'severity': 'high',
                'description': 'node_modules directory missing',
                'auto_fixable': True,
                'fix_action': 'npm_install'
            })
        else:
            # Check if key packages exist
            key_packages = ['next', 'react', '@types/node']
            missing_pkgs = []
            for pkg in key_packages:
                if not (nm_path / pkg).exists():
                    missing_pkgs.append(pkg)
            
            if missing_pkgs:
                self.issues_found.append({
                    'project': project,
                    'type': 'corrupted_node_modules',
                    'severity': 'medium',
                    'description': f'Missing packages: {", ".join(missing_pkgs)}',
                    'auto_fixable': True,
                    'fix_action': 'npm_reinstall'
                })
    
    async def _check_git_status(self, project: str, path: Path):
        """Check for uncommitted changes"""
        git_path = path / '.git'
        if not git_path.exists():
            return
        
        try:
            proc = await asyncio.create_subprocess_shell(
                'git status --porcelain',
                cwd=path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await proc.communicate()
            
            changes = stdout.decode().strip()
            if changes:
                change_count = len([l for l in changes.split('\n') if l.strip()])
                self.issues_found.append({
                    'project': project,
                    'type': 'uncommitted_changes',
                    'severity': 'low',
                    'description': f'{change_count} uncommitted changes',
                    'auto_fixable': True,
                    'fix_action': 'git_commit'
                })
        except:
            pass
    
    async def _check_build_config(self, project: str, path: Path):
        """Check build configuration"""
        next_config = path / 'next.config.js'
        vercel_json = path / 'vercel.json'
        
        if next_config.exists() and not vercel_json.exists():
            self.issues_found.append({
                'project': project,
                'type': 'missing_vercel_config',
                'severity': 'medium',
                'description': 'Missing vercel.json for deployment',
                'auto_fixable': True,
                'fix_action': 'create_vercel_json'
            })
    
    async def _auto_fix(self):
        """Attempt to auto-fix issues"""
        for issue in self.issues_found:
            if not issue.get('auto_fixable'):
                continue
            
            project = issue['project']
            path = Path.home() / project
            action = issue.get('fix_action')
            
            try:
                if action == 'npm_install':
                    await self._run_npm_install(path)
                    self.issues_fixed.append(issue)
                    
                elif action == 'npm_reinstall':
                    await self._run_npm_reinstall(path)
                    self.issues_fixed.append(issue)
                    
                elif action == 'create_env_template':
                    await self._create_env_template(path)
                    self.issues_fixed.append(issue)
                    
                elif action == 'git_commit':
                    await self._git_commit(path)
                    self.issues_fixed.append(issue)
                    
                elif action == 'create_vercel_json':
                    await self._create_vercel_json(path)
                    self.issues_fixed.append(issue)
                    
            except Exception as e:
                issue['fix_error'] = str(e)
    
    async def _run_npm_install(self, path: Path):
        """Run npm install"""
        proc = await asyncio.create_subprocess_shell(
            'npm install',
            cwd=path,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL
        )
        await proc.wait()
    
    async def _run_npm_reinstall(self, path: Path):
        """Remove and reinstall node_modules"""
        import shutil
        nm_path = path / 'node_modules'
        if nm_path.exists():
            shutil.rmtree(nm_path)
        await self._run_npm_install(path)
    
    async def _create_env_template(self, path: Path):
        """Create env template file"""
        template = """# Environment Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DEEPSEEK_API_KEY=
"""
        env_path = path / '.env.local'
        env_path.write_text(template)
    
    async def _git_commit(self, path: Path):
        """Auto-commit changes"""
        timestamp = datetime.now().isoformat()
        await asyncio.create_subprocess_shell(
            f'git add -A && git commit -m "Auto-fix: {timestamp}"',
            cwd=path,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL
        )
    
    async def _create_vercel_json(self, path: Path):
        """Create vercel.json"""
        import json
        config = {
            "version": 2,
            "builds": [{"src": "package.json", "use": "@vercel/next"}]
        }
        vercel_path = path / 'vercel.json'
        vercel_path.write_text(json.dumps(config, indent=2))
    
    def get_summary(self) -> Dict:
        """Get repair summary"""
        critical = len([i for i in self.issues_found if i.get('severity') == 'critical'])
        high = len([i for i in self.issues_found if i.get('severity') == 'high'])
        medium = len([i for i in self.issues_found if i.get('severity') == 'medium'])
        low = len([i for i in self.issues_found if i.get('severity') == 'low'])
        
        return {
            'name': self.name,
            'status': self.status,
            'issues_found': len(self.issues_found),
            'issues_fixed': len(self.issues_fixed),
            'breakdown': {'critical': critical, 'high': high, 'medium': medium, 'low': low},
            'projects_checked': len(self.projects)
        }
    
    def get_stats(self) -> Dict:
        """Get hound statistics"""
        return {
            'name': self.name,
            'status': self.status,
            'bounties_found': self.bounties_found,
            'issues_fixed': len(self.issues_fixed),
            'projects_monitored': len(self.projects),
            'last_hunt': self.last_hunt.isoformat() if self.last_hunt else None
        }
