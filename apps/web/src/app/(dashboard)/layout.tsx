"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Cpu, Target, Layers, TrendingUp, Settings, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard",     label: "Hound Brain",    icon: Cpu,        desc: "Queen Bee command center" },
  { href: "/opportunities", label: "Opportunities",  icon: Target,     desc: "Scout market niches" },
  { href: "/campaigns",     label: "Campaigns",      icon: Layers,     desc: "Active campaigns" },
  { href: "/revenue",       label: "Revenue",        icon: TrendingUp, desc: "MRR & financials" },
  { href: "/hive",          label: "Hive Log",       icon: Activity,   desc: "All bee activity" },
  { href: "/settings",      label: "Settings",       icon: Settings,   desc: "API keys & config" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside
        className="flex flex-col shrink-0"
        style={{
          width: "var(--sidebar-width)",
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-5 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div
            className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0"
            style={{ border: "1px solid var(--border-strong)" }}
          >
            <Image
              src="/cyberhound-mascot.png"
              alt="CyberHound"
              fill
              className="object-cover"
              sizes="36px"
            />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              CyberHound
            </p>
            <p className="text-xs font-medium" style={{ color: "var(--accent-dark)" }}>
              Colony OS
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-100 w-full",
                )}
                style={
                  active
                    ? {
                        background: "var(--accent-light)",
                        color: "var(--accent-dark)",
                      }
                    : {
                        color: "var(--text-secondary)",
                      }
                }
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <Icon
                  className="w-4 h-4 shrink-0"
                  style={{ color: active ? "var(--accent-dark)" : "var(--text-muted)" }}
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="px-5 py-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full pulse shrink-0"
              style={{ background: "var(--status-green)" }}
            />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Hound active
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────── */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ background: "var(--bg-base)" }}
      >
        {children}
      </main>
    </div>
  );
}
