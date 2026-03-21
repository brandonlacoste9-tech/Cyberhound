"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Cpu,
  Target,
  Layers,
  TrendingUp,
  Settings,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Hound Brain", icon: Cpu, desc: "Queen Bee command center" },
  { href: "/opportunities", label: "Opportunities", icon: Target, desc: "Scout market niches" },
  { href: "/campaigns", label: "Campaigns", icon: Layers, desc: "Active campaigns" },
  { href: "/revenue", label: "Revenue", icon: TrendingUp, desc: "MRR & financials" },
  { href: "/hive", label: "Hive Log", icon: Activity, desc: "All bee activity" },
  { href: "/settings", label: "Settings", icon: Settings, desc: "API keys & config" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside
        className="flex flex-col shrink-0 border-r"
        style={{
          width: "var(--sidebar-width)",
          background: "var(--bg-surface)",
          borderColor: "var(--glass-border)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-5 py-5 border-b"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <div
            className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0"
            style={{ border: "1px solid rgba(251,191,36,0.3)" }}
          >
            <Image
              src="/cyberhound-mascot.png"
              alt="CyberHound"
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              CyberHound
            </p>
            <p className="text-[11px] font-medium" style={{ color: "var(--amber-500)" }}>
              Colony OS
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1">
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
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  active ? "" : "hover:bg-white/5"
                )}
                style={
                  active
                    ? {
                        background: "rgba(251,191,36,0.12)",
                        color: "var(--amber-400)",
                        border: "1px solid rgba(251,191,36,0.22)",
                      }
                    : {
                        color: "var(--text-secondary)",
                        border: "1px solid transparent",
                      }
                }
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Status footer */}
        <div
          className="px-5 py-4 border-t"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="w-2 h-2 rounded-full hound-pulse shrink-0"
              style={{ background: "var(--status-hunting)" }}
            />
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Hound active
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
