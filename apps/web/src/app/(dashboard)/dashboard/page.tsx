import { HoundBrain } from "@/components/dashboard/HoundBrain";
import { BeeStatusGrid } from "@/components/dashboard/BeeStatusGrid";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickStats } from "@/components/dashboard/QuickStats";

export const metadata = { title: "Hound Brain | CyberHound" };

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Hound Brain
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Queen Bee command center — autonomous revenue operations
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: "var(--status-green-bg)",
            color: "var(--status-green)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full pulse" style={{ background: "var(--status-green)" }} />
          Hunting
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
