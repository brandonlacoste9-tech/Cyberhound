"""
HoundManager - Command center for managing the Cyberhound swarm.
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, List, Optional

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.layout import Layout
from rich.live import Live
from rich.text import Text
from rich import box

# Import active hounds
from .hounds.saas_hound import SaaSHound
from .hounds.upwork_hound import UpworkHound
from .hounds.algora_hound import AlgoraHound
from .hounds.codementor_hound import CodementorHound
from .hounds.system_hound import SystemHound


class HoundManager:
    """
    Manages the Cyberhound swarm.

    Agents:
    1. SaaSHound - Hunts SaaS deals and discounts
    2. UpworkHound - Hunts freelance opportunities
    3. AlgoraHound - Hunts GitHub bounties
    4. CodementorHound - Hunts mentoring/debugging demand
    5. SystemHound - Monitors and repairs systems
    """
    
    def __init__(self):
        self.console = Console()
        self.hounds: Dict[str, object] = {}
        self.hunt_results: Dict[str, List[Dict]] = {}
        self.is_running = False
        
        # Initialize the active hounds
        self._initialize_hounds()
    
    def _initialize_hounds(self):
        """Initialize all active hounds with default config"""
        self.hounds['saas'] = SaaSHound({
            'min_discount': 30,
            'sources': ['appsumo', 'stacksocial', 'producthunt']
        })
        
        self.hounds['upwork'] = UpworkHound({
            'skills': ['python', 'react', 'nextjs', 'typescript'],
            'min_hourly_rate': 50,
            'min_fixed_budget': 1000
        })
        
        self.hounds['algora'] = AlgoraHound({
            'languages': ['python', 'typescript', 'javascript'],
            'min_bounty': 100
        })
        
        self.hounds['codementor'] = CodementorHound({
            'skills': ['python', 'react', 'typescript', 'debugging'],
            'max_results': 8,
        })

        self.hounds['system'] = SystemHound({
            'projects': ['Vraie-Quebec', 'lambiance', 'ZyeuteV5'],
            'auto_fix': False
        })
        
        self.console.print(f"[green]✓[/green] {len(self.hounds)} hounds initialized and ready")
    
    # ═══════════════════════════════════════════════════════════════
    # HUNT OPERATIONS
    # ═══════════════════════════════════════════════════════════════
    
    async def hunt_all(self, filters: Optional[Dict] = None) -> Dict[str, List[Dict]]:
        """Deploy all active hounds simultaneously"""
        self.console.print("\n[bold cyan]🐺 DEPLOYING THE PACK...[/bold cyan]\n")
        
        tasks = []
        hound_names = []
        
        for name, hound in self.hounds.items():
            self.console.print(f"  [yellow]→[/yellow] Unleashing {hound.name}...")
            tasks.append(hound.hunt(filters))
            hound_names.append(name)
        
        # Run all hunts in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Store results
        for name, result in zip(hound_names, results):
            if isinstance(result, Exception):
                self.console.print(f"  [red]✗[/red] {name} failed: {result}")
                self.hunt_results[name] = []
            else:
                self.hunt_results[name] = result
                self.console.print(f"  [green]✓[/green] {name} found {len(result)} opportunities")
        
        return self.hunt_results
    
    async def hunt_single(self, hound_name: str, filters: Optional[Dict] = None) -> List[Dict]:
        """Deploy a single hound"""
        if hound_name not in self.hounds:
            self.console.print(f"[red]Unknown hound: {hound_name}[/red]")
            return []
        
        hound = self.hounds[hound_name]
        self.console.print(f"\n[bold cyan]🐺 Unleashing {hound.name}...[/bold cyan]")
        
        result = await hound.hunt(filters)
        self.hunt_results[hound_name] = result
        
        self.console.print(f"[green]✓[/green] Found {len(result)} opportunities")
        return result
    
    # ═══════════════════════════════════════════════════════════════
    # STATUS & DISPLAY
    # ═══════════════════════════════════════════════════════════════
    
    def get_status_table(self) -> Table:
        """Get a table showing current status of all hounds"""
        table = Table(
            title="🐺 PACK STATUS",
            box=box.ROUNDED,
            border_style="bright_green",
            header_style="bold cyan"
        )
        
        table.add_column("Hound", style="bold white", width=15)
        table.add_column("Type", style="cyan", width=12)
        table.add_column("Status", width=12)
        table.add_column("Bounties", justify="right", width=10)
        table.add_column("Last Hunt", width=15)
        table.add_column("Specialty", width=30)
        
        status_colors = {
            "HUNTING": "bright_green",
            "RESTING": "blue",
            "OFFLINE": "red",
            "ERROR": "red",
            "IDLE": "dim"
        }
        
        status_emojis = {
            "HUNTING": "🟢",
            "RESTING": "⚪",
            "OFFLINE": "🔴",
            "ERROR": "💀",
            "IDLE": "⚪"
        }
        
        specialties = {
            'saas': 'SaaS lifetime deals & discounts',
            'upwork': 'High-paying freelance gigs',
            'algora': 'GitHub bounties & OSS rewards',
            'codementor': 'Live coding help & debugging demand',
            'system': 'System health & auto-repair'
        }
        
        for key, hound in self.hounds.items():
            color = status_colors.get(hound.status, "white")
            emoji = status_emojis.get(hound.status, "⚪")
            
            last_hunt = "Never"
            if hound.last_hunt:
                delta = datetime.now() - hound.last_hunt
                if delta.seconds < 60:
                    last_hunt = f"{delta.seconds}s ago"
                elif delta.seconds < 3600:
                    last_hunt = f"{delta.seconds // 60}m ago"
                else:
                    last_hunt = f"{delta.seconds // 3600}h ago"
            
            table.add_row(
                f"🐺 {hound.name}",
                hound.category.upper(),
                f"{emoji} [{color}]{hound.status}[/{color}]",
                str(hound.bounties_found),
                last_hunt,
                specialties.get(key, "")
            )
        
        return table
    
    def get_results_summary(self) -> Panel:
        """Get a summary of recent hunt results"""
        if not self.hunt_results:
            return Panel("No hunts completed yet", title="📊 Results", border_style="dim")
        
        text = Text()
        
        for name, results in self.hunt_results.items():
            if results:
                hound = self.hounds[name]
                hot_count = len([r for r in results if r.get('hot_deal')])
                text.append(f"{hound.name}: ", style="bold")
                text.append(f"{len(results)} found", style="green")
                if hot_count:
                    text.append(f" ({hot_count} hot)", style="yellow")
                text.append("\n")
            else:
                text.append(f"{name}: ", style="bold")
                text.append("No results\n", style="dim")
        
        return Panel(text, title="📊 Last Hunt Results", border_style="cyan")
    
    def show_hunt_results(self, hound_name: Optional[str] = None):
        """Display detailed hunt results"""
        if hound_name:
            # Show specific hound results
            if hound_name not in self.hunt_results:
                self.console.print(f"[red]No results for {hound_name}[/red]")
                return
            
            results = self.hunt_results[hound_name]
            self._display_hound_results(hound_name, results)
        else:
            # Show all results
            for name, results in self.hunt_results.items():
                if results:
                    self._display_hound_results(name, results)
                    self.console.print()
    
    def _display_hound_results(self, hound_name: str, results: List[Dict]):
        """Display results for a specific hound"""
        hound = self.hounds[hound_name]
        
        title = f"🐺 {hound.name} Results ({len(results)} found)"
        self.console.print(f"\n[bold cyan]{title}[/bold cyan]")
        self.console.print("=" * 60)
        
        if not results:
            self.console.print("[dim]No opportunities found[/dim]")
            return
        
        # Show top 5
        for i, result in enumerate(results[:5], 1):
            hot = "🔥 " if result.get('hot_deal') else ""
            score = result.get('score', 0)
            
            self.console.print(f"\n{hot}[bold]{i}. {result.get('title', 'Untitled')}[/bold]")
            self.console.print(f"   Score: {score}/100 | Platform: {result.get('platform', 'Unknown')}")
            
            if 'reward' in result or 'bounty_amount' in result:
                reward = result.get('reward') or f"${result.get('bounty_amount')}"
                self.console.print(f"   💰 {reward}")
            
            if 'url' in result:
                self.console.print(f"   🔗 {result['url']}")
    
    # ═══════════════════════════════════════════════════════════════
    # COMMANDS
    # ═══════════════════════════════════════════════════════════════
    
    async def run_command(self, command: str, args: List[str] = None):
        """Execute a management command"""
        args = args or []
        
        if command == "status":
            self.console.print(self.get_status_table())
            self.console.print(self.get_results_summary())
        
        elif command == "hunt":
            if args and args[0] in self.hounds:
                await self.hunt_single(args[0])
            else:
                await self.hunt_all()
        
        elif command == "results":
            hound_name = args[0] if args else None
            self.show_hunt_results(hound_name)
        
        elif command == "hot":
            self.show_hot_deals()
        
        elif command == "stats":
            self.show_stats()
        
        elif command == "repair":
            if 'system' in self.hounds:
                await self.hounds['system'].hunt({'auto_fix': True})
                summary = self.hounds['system'].get_summary()
                self.console.print(f"\n[bold]🔧 Repair Complete:[/bold]")
                self.console.print(f"  Issues found: {summary['issues_found']}")
                self.console.print(f"  Issues fixed: {summary['issues_fixed']}")
        
        elif command == "help":
            self.show_help()
        
        else:
            self.console.print(f"[red]Unknown command: {command}[/red]")
            self.show_help()
    
    def show_hot_deals(self):
        """Show all hot deals across all hounds"""
        self.console.print("\n[bold yellow]🔥 HOT DEALS ACROSS ALL HOUNDS[/bold yellow]\n")
        
        hot_found = False
        
        for name, hound in self.hounds.items():
            hot_deals = []
            
            if hasattr(hound, 'get_hot_deals'):
                hot_deals = hound.get_hot_deals()
            elif hasattr(hound, 'get_hot_bounties'):
                hot_deals = hound.get_hot_bounties()
            elif hasattr(hound, 'get_hot_requests'):
                hot_deals = hound.get_hot_requests()
            elif name == 'system':
                continue
            
            if hot_deals:
                hot_found = True
                self.console.print(f"[bold]{hound.name}:[/bold]")
                for deal in hot_deals:
                    self.console.print(f"  • {deal.get('title')}")
                    if 'discount_percent' in deal:
                        self.console.print(f"    {deal['discount_percent']}% off")
                    if 'bounty_amount' in deal:
                        self.console.print(f"    ${deal['bounty_amount']}")
                self.console.print()
        
        if not hot_found:
            self.console.print("[dim]No hot deals currently. Run a hunt to find some![/dim]")
    
    def show_stats(self):
        """Show detailed statistics"""
        self.console.print("\n[bold cyan]📊 PACK STATISTICS[/bold cyan]\n")
        
        table = Table(box=box.SIMPLE)
        table.add_column("Hound", style="bold")
        table.add_column("Total Bounties", justify="right")
        table.add_column("Status")
        table.add_column("Last Hunt")
        
        total = 0
        for name, hound in self.hounds.items():
            total += hound.bounties_found
            last = hound.last_hunt.strftime("%H:%M:%S") if hound.last_hunt else "Never"
            table.add_row(
                hound.name,
                str(hound.bounties_found),
                hound.status,
                last
            )
        
        table.add_row("[bold]TOTAL[/bold]", str(total), "", "", style="bold green")
        
        self.console.print(table)
    
    def show_help(self):
        """Show available commands"""
        help_text = """
[bold cyan]🐺 CYBERHOUND SWARM - Available Commands[/bold cyan]

[bold]Pack Control:[/bold]
  status              Show current status of all active hounds
  hunt [hound]        Deploy all hounds (or specific one)
  hot                 Show hot deals across all hounds
  stats               Show detailed statistics

[bold]Results:[/bold]
  results [hound]     Show detailed results (optionally filtered)

[bold]Maintenance:[/bold]
  repair              Run system repair hound

[bold]Info:[/bold]
  help                Show this help message
  quit                Exit the manager

[bold]Examples:[/bold]
  hunt                # Hunt with all active hounds
  hunt saas          # Hunt only SaaS deals
  results upwork     # Show Upwork results
  hot                # See all hot opportunities
        """
        self.console.print(help_text)
    
    # ═══════════════════════════════════════════════════════════════
    # INTERACTIVE MODE
    # ═══════════════════════════════════════════════════════════════
    
    async def interactive_mode(self):
        """Run interactive command loop"""
        self.console.print("""
[bold green]╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🐺 CYBERHOUND SWARM - Live Pack Active                 ║
║                                                           ║
║   SaaS | Upwork | Algora | Codementor | System           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝[/bold green]
""")
        
        self.show_help()
        
        while True:
            try:
                user_input = input("\n🐺 > ").strip()
                if not user_input:
                    continue
                
                parts = user_input.split()
                command = parts[0].lower()
                args = parts[1:]
                
                if command in ('quit', 'exit', 'q'):
                    self.console.print("[yellow]Recalling the pack... Goodbye![/yellow]")
                    break
                
                await self.run_command(command, args)
                
            except KeyboardInterrupt:
                print()
                continue
            except EOFError:
                break


# Quick entry point
def main():
    """Run the HoundManager"""
    import sys
    
    manager = HoundManager()
    
    # Check for command line args
    if len(sys.argv) > 1:
        command = sys.argv[1]
        args = sys.argv[2:]
        asyncio.run(manager.run_command(command, args))
    else:
        # Interactive mode
        asyncio.run(manager.interactive_mode())


if __name__ == "__main__":
    main()
