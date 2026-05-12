#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ⚜️  CYBERHOUND COMMAND CENTER ⚜️                                           ║
║                                                                              ║
║   Live Terminal Dashboard with Rich                                          ║
║   Gold, leather, and cyber-styling                                           ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

Real-time monitoring of the active pack:
- SaaSHound: SaaS deal hunter
- UpworkHound: Freelance gig hunter  
- AlgoraHound: GitHub bounty hunter
- CodementorHound: Mentoring demand hunter
- SystemHound: System repair specialist
"""

import asyncio
import random
from datetime import datetime
from typing import Dict, List, Optional

from rich.console import Console, Group
from rich.table import Table
from rich.panel import Panel
from rich.layout import Layout
from rich.live import Live
from rich.text import Text
from rich.align import Align
from rich import box
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn
from rich.prompt import Prompt

from .hound_manager import HoundManager


class CommandCenter:
    """
    Premium live dashboard for the Cyberhound Swarm
    
    Features:
    - Real-time pack status monitoring
    - Live hunt progress tracking
    - Hot deals feed
    - System logs
    - Interactive command input
    """
    
    # Color scheme - Sovereign Gold & Cyber
    COLORS = {
        'gold': 'gold3',
        'gold_bright': 'bright_yellow',
        'cyan': 'cyan',
        'cyan_dim': 'dim cyan',
        'magenta': 'magenta',
        'green': 'green',
        'red': 'red',
        'grey': 'grey37',
        'white': 'white',
        'leather': 'rgb(139, 90, 43)',  # Saddle brown
    }
    
    def __init__(self, manager: HoundManager):
        self.manager = manager
        self.console = Console()
        self.layout = self._create_layout()
        self.logs: List[str] = []
        self.max_logs = 20
        self.is_running = False
        self.command_queue = []
        
    def _create_layout(self) -> Layout:
        """Create the dashboard layout"""
        layout = Layout(name="root")
        
        # Split into header, main, footer
        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="main"),
            Layout(name="footer", size=3)
        )
        
        # Main area split into left (status) and right (details)
        layout["main"].split_row(
            Layout(name="left", ratio=2),
            Layout(name="right", ratio=1)
        )
        
        # Left split into pack status and hot deals
        layout["main"]["left"].split_column(
            Layout(name="pack_status", ratio=1),
            Layout(name="hot_deals", ratio=1)
        )
        
        # Right split into stats and logs
        layout["main"]["right"].split_column(
            Layout(name="stats", size=8),
            Layout(name="logs")
        )
        
        return layout
    
    # ═════════════════════════════════════════════════════════════════
    # PANEL GENERATORS
    # ═════════════════════════════════════════════════════════════════
    
    def _header_panel(self) -> Panel:
        """Create the header panel with branding"""
        current_time = datetime.now().strftime("%H:%M:%S")
        
        title = Text()
        title.append("⚜️  ", style=self.COLORS['gold'])
        title.append("CYBERHOUND", style=f"bold {self.COLORS['gold']}")
        title.append(" COMMAND CENTER", style=self.COLORS['cyan'])
        title.append("  ⚜️", style=self.COLORS['gold'])
        
        subtitle = Text()
        subtitle.append(f"Live Pack Active  •  ", style=self.COLORS['grey'])
        subtitle.append(f"{current_time}", style=self.COLORS['cyan_dim'])
        
        content = Group(
            Align.center(title),
            Align.center(subtitle)
        )
        
        return Panel(
            content,
            box=box.DOUBLE,
            border_style=self.COLORS['gold'],
            padding=(0, 1)
        )
    
    def _pack_status_panel(self) -> Panel:
        """Create the pack status table"""
        table = Table(
            box=box.ROUNDED,
            border_style=self.COLORS['gold'],
            header_style=f"bold {self.COLORS['gold']}",
            row_styles=["", "dim"]
        )
        
        table.add_column("🐺 Limier", style=f"bold {self.COLORS['cyan']}", width=14)
        table.add_column("Spécialité", style=self.COLORS['grey'], width=18)
        table.add_column("Statut", width=14)
        table.add_column("Primes", justify="right", style=self.COLORS['magenta'], width=8)
        table.add_column("Score", justify="right", width=6)
        
        # Status styles
        status_styles = {
            'HUNTING': (f"🟢 {self.COLORS['green']}", 'EN CHASSE'),
            'RESTING': (f"⚪ {self.COLORS['cyan']}", 'REPOS'),
            'IDLE': (f"⚪ {self.COLORS['grey']}", 'INACTIF'),
            'ERROR': (f"🔴 {self.COLORS['red']}", 'ERREUR'),
        }
        
        for key, hound in self.manager.hounds.items():
            emoji_style, status_text = status_styles.get(
                hound.status, 
                (f"⚪ {self.COLORS['grey']}", hound.status)
            )
            
            # Get hot deals count
            hot_count = 0
            if key in self.manager.hunt_results:
                hot_count = len([r for r in self.manager.hunt_results[key] if r.get('hot_deal')])
            
            table.add_row(
                hound.name,
                self._get_specialty(key),
                f"[{emoji_style}]{status_text}[/{emoji_style.split()[1]}]",
                str(hound.bounties_found),
                f"{hot_count}🔥" if hot_count else "-"
            )
        
        return Panel(
            table,
            title=f"[bold {self.COLORS['gold']}]⚜️ ÉTAT DE LA MEUTE ⚜️[/]",
            border_style=self.COLORS['gold'],
            padding=(0, 1)
        )
    
    def _hot_deals_panel(self) -> Panel:
        """Create the hot deals feed"""
        deals_text = Text()
        
        hot_deals = self._collect_hot_deals()
        
        if not hot_deals:
            deals_text.append("Aucune prime chaude pour l'instant...\n", style=self.COLORS['grey'])
            deals_text.append("Déployez la meute pour trouver des opportunités!", style=self.COLORS['cyan_dim'])
        else:
            for i, deal in enumerate(hot_deals[:5], 1):
                deals_text.append(f"{i}. ", style=self.COLORS['gold'])
                deals_text.append(f"{deal['title'][:35]}...\n", style=self.COLORS['white'])
                
                # Add details
                reward = deal.get('reward') or deal.get('bounty_amount') or deal.get('hourly_rate')
                if reward:
                    deals_text.append(f"   💰 ", style=self.COLORS['gold'])
                    deals_text.append(f"{reward}", style=self.COLORS['green'])
                    deals_text.append(f" via {deal.get('platform', 'Unknown')}\n", style=self.COLORS['grey'])
                
                if i < len(hot_deals[:5]):
                    deals_text.append("\n")
        
        return Panel(
            deals_text,
            title=f"[bold {self.COLORS['gold']}]🔥 PRIMES CHAUDES 🔥[/]",
            border_style=self.COLORS['magenta'],
            padding=(0, 1)
        )
    
    def _stats_panel(self) -> Panel:
        """Create the statistics panel"""
        total_bounties = sum(h.bounties_found for h in self.manager.hounds.values())
        
        active_hounds = sum(1 for h in self.manager.hounds.values() if h.status == 'HUNTING')
        
        stats_text = Text()
        stats_text.append("📊 STATISTIQUES\n", style=f"bold {self.COLORS['gold']}")
        stats_text.append("─" * 20 + "\n", style=self.COLORS['grey'])
        
        stats_text.append("Total Primes: ", style=self.COLORS['cyan'])
        stats_text.append(f"{total_bounties}\n", style=f"bold {self.COLORS['magenta']}")
        
        stats_text.append("Limiers Actifs: ", style=self.COLORS['cyan'])
        stats_text.append(f"{active_hounds}/4\n", style=self.COLORS['green'] if active_hounds > 0 else self.COLORS['grey'])
        
        stats_text.append("Dernière Chasse: ", style=self.COLORS['cyan'])
        last_hunt = self._get_last_hunt_time()
        stats_text.append(f"{last_hunt}\n", style=self.COLORS['white'])
        
        return Panel(
            stats_text,
            border_style=self.COLORS['cyan'],
            padding=(0, 1)
        )
    
    def _logs_panel(self) -> Panel:
        """Create the system logs panel"""
        if not self.logs:
            log_text = Text("En attente d'activité...", style=self.COLORS['grey'])
        else:
            log_text = Text()
            for log in self.logs[-8:]:  # Show last 8 logs
                log_text.append(f"{log}\n", style=self.COLORS['grey'])
        
        return Panel(
            log_text,
            title=f"[bold {self.COLORS['cyan']}]📜 JOURNAL 📜[/]",
            border_style=self.COLORS['cyan_dim'],
            padding=(0, 1)
        )
    
    def _footer_panel(self) -> Panel:
        """Create the footer with commands"""
        commands = Text()
        commands.append("[H]unter  ", style=self.COLORS['gold'])
        commands.append("[S]tatus  ", style=self.COLORS['cyan'])
        commands.append("[R]éparer  ", style=self.COLORS['magenta'])
        commands.append("[C]haud  ", style=self.COLORS['green'])
        commands.append("[Q]uitter", style=self.COLORS['red'])
        
        return Panel(
            Align.center(commands),
            border_style=self.COLORS['gold'],
            box=box.SINGLE
        )
    
    # ═════════════════════════════════════════════════════════════════
    # HELPER METHODS
    # ═════════════════════════════════════════════════════════════════
    
    def _get_specialty(self, hound_key: str) -> str:
        """Get hound specialty description"""
        specialties = {
            'saas': 'Contrats SaaS 💎',
            'upwork': 'Freelance 💼',
            'algora': 'Bounties GitHub 🏆',
            'system': 'Réparations 🔧'
        }
        return specialties.get(hound_key, 'Chasseur')
    
    def _collect_hot_deals(self) -> List[Dict]:
        """Collect all hot deals from all hounds"""
        hot_deals = []
        
        for key, hound in self.manager.hounds.items():
            if key == 'system':
                continue
            
            # Get results from cache
            if key in self.manager.hunt_results:
                results = self.manager.hunt_results[key]
                for r in results:
                    if r.get('hot_deal'):
                        hot_deals.append(r)
        
        # Sort by score
        return sorted(hot_deals, key=lambda x: x.get('score', 0), reverse=True)
    
    def _get_last_hunt_time(self) -> str:
        """Get time since last hunt"""
        last_times = [
            h.last_hunt for h in self.manager.hounds.values() 
            if h.last_hunt
        ]
        
        if not last_times:
            return "Jamais"
        
        latest = max(last_times)
        delta = datetime.now() - latest
        
        if delta.seconds < 60:
            return f"{delta.seconds}s"
        elif delta.seconds < 3600:
            return f"{delta.seconds // 60}m"
        else:
            return f"{delta.seconds // 3600}h"
    
    def log(self, message: str):
        """Add a log entry"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.logs.append(f"[{timestamp}] {message}")
        if len(self.logs) > self.max_logs:
            self.logs = self.logs[-self.max_logs:]
    
    # ═════════════════════════════════════════════════════════════════
    # UPDATE & RENDER
    # ═════════════════════════════════════════════════════════════════
    
    def update_display(self):
        """Update all panels in the layout"""
        self.layout["header"].update(self._header_panel())
        self.layout["main"]["left"]["pack_status"].update(self._pack_status_panel())
        self.layout["main"]["left"]["hot_deals"].update(self._hot_deals_panel())
        self.layout["main"]["right"]["stats"].update(self._stats_panel())
        self.layout["main"]["right"]["logs"].update(self._logs_panel())
        self.layout["footer"].update(self._footer_panel())
    
    # ═════════════════════════════════════════════════════════════════
    # LIVE DASHBOARD
    # ═════════════════════════════════════════════════════════════════
    
    async def run_live(self, hunt_on_start: bool = False):
        """Run the live dashboard"""
        self.is_running = True
        
        # Initial log
        self.log("Centre de commandement initialisé")
        self.log("4 limiers prêts au déploiement")
        
        # Start hunt if requested
        if hunt_on_start:
            asyncio.create_task(self._background_hunt())
        
        with Live(
            self.layout,
            console=self.console,
            refresh_per_second=4,
            screen=True
        ) as live:
            while self.is_running:
                self.update_display()
                live.update(self.layout)
                await asyncio.sleep(0.25)
    
    async def _background_hunt(self):
        """Run hunt in background and update logs"""
        self.log("🐺 DÉPLOIEMENT DE LA MEUTE...")
        
        for name, hound in self.manager.hounds.items():
            if name == 'system':
                continue
            
            self.log(f"→ {hound.name} en chasse...")
            
            # Simulate hunt progress
            for _ in range(3):
                await asyncio.sleep(0.5)
            
            # Actually run hunt
            results = await hound.hunt()
            
            hot_count = len([r for r in results if r.get('hot_deal')])
            self.log(f"✓ {hound.name}: {len(results)} trouvés ({hot_count}🔥)")
        
        self.log("✅ Chasse terminée!")
    
    async def run_interactive(self):
        """Run with interactive command input"""
        # Start dashboard in background
        dashboard_task = asyncio.create_task(self.run_live())
        
        # Command loop
        await asyncio.sleep(1)  # Let dashboard render first
        
        try:
            while self.is_running:
                # Get command (this would need a different approach for true async input)
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            self.is_running = False
            dashboard_task.cancel()
    
    def stop(self):
        """Stop the dashboard"""
        self.is_running = False
        self.log("Centre de commandement arrêté")


# Simple test runner
async def demo_dashboard():
    """Demo the command center"""
    from .hound_manager import HoundManager
    
    print("Initializing Command Center...")
    manager = HoundManager()
    
    center = CommandCenter(manager)
    
    print("Launching live dashboard...")
    print("(Press Ctrl+C to exit)")
    
    try:
        await center.run_live(hunt_on_start=True)
    except KeyboardInterrupt:
        center.stop()
        print("\n👋 Goodbye!")


if __name__ == "__main__":
    asyncio.run(demo_dashboard())
