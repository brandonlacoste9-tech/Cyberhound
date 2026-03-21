"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Cpu, Target, Layers, TrendingUp, Settings, Activity, Search, Mail } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard",     label: "Hound Brain",   icon: Cpu,        emoji: "🧠" },
  { href: "/opportunities", label: "Opportunities",  icon: Target,     emoji: "🎯" },
  { href: "/analyst",       label: "Analyst Bee",    icon: Search,     emoji: "🔍" },
  { href: "/campaigns",     label: "Campaigns",      icon: Layers,     emoji: "🚀" },
  { href: "/outreach",      label: "Outreach",       icon: Mail,       emoji: "📧" },
  { href: "/revenue",       label: "Revenue",        icon: TrendingUp, emoji: "💰" },
  { href: "/hive",          label: "Hive Log",       icon: Activity,   emoji: "🐝" },
  { href: "/settings",      label: "Settings",       icon: Settings,   emoji: "⚙️" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)", position: "relative", zIndex: 1 }}>

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside
        className="flex flex-col shrink-0"
        style={{
          width: "var(--sidebar-width)",
          background: "rgba(8, 11, 18, 0.95)",
          borderRight: "1px solid var(--border)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Sidebar ambient glow */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "200px",
          background: "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* ── Logo ──────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-4 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div
            className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0"
            style={{
              border: "1px solid var(--border-amber)",
              boxShadow: "0 0 12px rgba(245,158,11,0.25)",
            }}
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
            <p className="text-sm font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
              CyberHound
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--amber)" }}>
              Colony OS
            </p>
          </div>
        </div>

        {/* ── Nav ───────────────────────────────────── */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === href || pathname.startsWith(href + "/");

            return (
              <Link
                key={href}
                href={href}
                className="nav-item"
                style={active ? {
                  background: "var(--amber-dim)",
                  color: "var(--amber)",
                  fontWeight: 600,
                } : {}}
              >
                <Icon
                  className="w-4 h-4 shrink-0"
                  style={{ color: active ? "var(--amber)" : "var(--text-muted)" }}
                />
                <span>{label}</span>
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "22%",
                      bottom: "22%",
                      width: "3px",
                      borderRadius: "0 3px 3px 0",
                      background: "var(--amber)",
                      boxShadow: "0 0 8px var(--amber)",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Status footer ─────────────────────────── */}
        <div
          className="px-4 py-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {/* DeepSeek model badge */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
            style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}
          >
            <span className="text-xs">🤖</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                deepseek-chat
              </p>
              <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                DeepSeek V3 · Active
              </p>
            </div>
            <span
              className="w-1.5 h-1.5 rounded-full pulse shrink-0"
              style={{ background: "var(--green)" }}
            />
          </div>

          {/* Hive status */}
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full pulse shrink-0"
              style={{ background: "var(--green)", boxShadow: "0 0 6px var(--green)" }}
            />
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Hound active
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────── */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ background: "transparent", position: "relative", zIndex: 1 }}
      >
        {children}
      </main>
    </div>
  );
}
