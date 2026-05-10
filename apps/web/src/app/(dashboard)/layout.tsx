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
  Search,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_SECTIONS: {
  label: string;
  items: { href: string; label: string; icon: typeof Cpu }[];
}[] = [
  {
    label: "Command",
    items: [
      { href: "/dashboard", label: "Hound Brain", icon: Cpu },
      { href: "/opportunities", label: "Opportunities", icon: Target },
    ],
  },
  {
    label: "Pipeline",
    items: [
      { href: "/analyst", label: "Analyst Bee", icon: Search },
      { href: "/campaigns", label: "Campaigns", icon: Layers },
      { href: "/outreach", label: "Outreach", icon: Mail },
      { href: "/revenue", label: "Revenue", icon: TrendingUp },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/hive", label: "Hive Log", icon: Activity },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg-base)", position: "relative", zIndex: 1 }}
    >
      <aside className="sidebar-shell flex flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40"
          style={{
            background:
              "radial-gradient(ellipse 90% 80% at 50% 0%, rgba(245,158,11,0.09) 0%, transparent 65%)",
          }}
        />

        <div className="sidebar-brand relative z-[1]">
          <div className="sidebar-brand__mark shrink-0">
            <Image
              src="/cyberhound-mascot.png"
              alt="CyberHound"
              fill
              className="object-cover"
              sizes="40px"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="sidebar-brand__title truncate">CyberHound</p>
            <p className="sidebar-brand__tag">Colony OS</p>
          </div>
        </div>

        <nav className="relative z-[1] flex-1 overflow-y-auto px-3 pb-4 pt-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="nav-section-label">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon }) => {
                  const active = isActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn("nav-item", active && "active")}
                    >
                      <Icon
                        className="h-4 w-4 shrink-0 opacity-90"
                        strokeWidth={active ? 2.25 : 1.75}
                        style={{
                          color: active ? "var(--amber-bright)" : "var(--text-muted)",
                        }}
                      />
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div
          className="relative z-[1] mt-auto space-y-3 border-t px-3 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="sidebar-footer-card">
            <div className="flex items-center gap-2.5">
              <span className="text-lg leading-none" aria-hidden>
                🤖
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                  deepseek-chat
                </p>
                <p className="text-[10px] leading-tight" style={{ color: "var(--text-muted)" }}>
                  DeepSeek V3 · Active
                </p>
              </div>
              <span
                className="pulse h-2 w-2 shrink-0 rounded-full"
                style={{ background: "var(--green)", boxShadow: "0 0 8px var(--green)" }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 px-1">
            <span
              className="pulse h-2 w-2 shrink-0 rounded-full"
              style={{ background: "var(--green)", boxShadow: "0 0 8px var(--green)" }}
            />
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Colony online
            </span>
          </div>
        </div>
      </aside>

      <main
        className="main-canvas relative z-[1] min-w-0 flex-1 overflow-y-auto"
        style={{ background: "transparent" }}
      >
        <div className="dashboard-shell">{children}</div>
      </main>
    </div>
  );
}
