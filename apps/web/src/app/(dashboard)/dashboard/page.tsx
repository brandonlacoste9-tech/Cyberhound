import { HoundBrain } from "@/components/dashboard/HoundBrain";
import { BeeStatusGrid } from "@/components/dashboard/BeeStatusGrid";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickStats } from "@/components/dashboard/QuickStats";

export const metadata = {
  title: "Hound Brain | CyberHound",
};

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Hound Brain
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Queen Bee command center — autonomous revenue operations
          </p>
        </div>
        <HoundBrainStatus />
      </div>

      {/* Quick stats row */}
      <QuickStats />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hound Brain (2/3 width) */}
        <div className="lg:col-span-2">
          <HoundBrain />
        </div>
        {/* Bee status (1/3 width) */}
        <div>
          <BeeStatusGrid />
        </div>
      </div>

      {/* Recent activity */}
      <RecentActivity />
    </div>
  );
}

function HoundBrainStatus() {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{
        background: "rgba(251,191,36,0.1)",
        border: "1px solid rgba(251,191,36,0.25)",
        color: "var(--amber-400)",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full hound-pulse" style={{ background: "var(--amber-400)" }} />
      HUNTING
    </div>
  );
}
