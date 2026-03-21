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
  { href: "/dashboard", label: "Hound Brain", icon: Cpu },
  { href: "/dashboard/opportunities", label: "Opportunities", icon: Target },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Layers },
  { href: "/dashboard/revenue", label: "Revenue", icon: TrendingUp },
  { href: "/dashboard/hive", label: "Hive Log", icon: Activity },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col w-56 shrink-0 border-r"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--glass-border)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-5 py-4 border-b"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <div
            className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0"
            style={{ border: "1px solid rgba(251,191,36,0.25)" }}
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
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
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
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                  active
                    ? "font-medium"
                    : "hover:opacity-80"
                )}
                style={
                  active
                    ? {
                        background: "rgba(251,191,36,0.1)",
                        color: "var(--amber-400)",
                        border: "1px solid rgba(251,191,36,0.2)",
                      }
                    : { color: "var(--text-secondary)" }
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Status footer */}
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full hound-pulse"
              style={{ background: "var(--status-hunting)" }}
            />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Hound active
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
