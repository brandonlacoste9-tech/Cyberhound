import { HoundBrain } from "@/components/dashboard/HoundBrain";
import { BeeStatusGrid } from "@/components/dashboard/BeeStatusGrid";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickStats } from "@/components/dashboard/QuickStats";

export const metadata = { title: "Hound Brain | CyberHound" };

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6" style={{ position: "relative", zIndex: 1 }}>

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
            Hound{" "}
            <span className="text-gradient">Brain</span>
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Queen Bee command center — autonomous revenue operations
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: "var(--green-dim)",
            border: "1px solid rgba(16,185,129,0.25)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full pulse"
            style={{ background: "var(--green)", boxShadow: "0 0 6px var(--green)" }}
          />
          <span className="text-xs font-semibold" style={{ color: "var(--green)" }}>
            Hunting
          </span>
        </div>
      </div>

      {/* ── Quick stats ─────────────────────────────── */}
      <QuickStats />

      {/* ── Main grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <HoundBrain />
          <BeeStatusGrid />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
