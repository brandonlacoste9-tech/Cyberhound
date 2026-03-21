import { HoundBrain } from "@/components/dashboard/HoundBrain";
import { BeeStatusGrid } from "@/components/dashboard/BeeStatusGrid";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickStats } from "@/components/dashboard/QuickStats";

export const metadata = {
  title: "Hound Brain | CyberHound",
};

export default function DashboardPage() {
  return (
    <div className="p-7 space-y-7">
      {/* ── Page header ───────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-3xl font-black tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Hound Brain
          </h1>
          <p
            className="text-sm mt-1.5 font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Queen Bee command center — autonomous revenue operations
          </p>
        </div>
        <HoundBrainStatus />
      </div>

      {/* ── Quick stats ───────────────────────────── */}
      <QuickStats />

      {/* ── Main grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hound Brain chat — 2/3 */}
        <div className="lg:col-span-2">
          <HoundBrain />
        </div>
        {/* Bee status panel — 1/3 */}
        <div>
          <BeeStatusGrid />
        </div>
      </div>

      {/* ── Recent activity ───────────────────────── */}
      <RecentActivity />
    </div>
  );
}

function HoundBrainStatus() {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase"
      style={{
        background: "rgba(251,191,36,0.1)",
        border: "1px solid rgba(251,191,36,0.28)",
        color: "var(--amber-400)",
      }}
    >
      <span
        className="w-2 h-2 rounded-full hound-pulse"
        style={{ background: "var(--amber-400)" }}
      />
      Hunting
    </div>
  );
}
