import { HoundBrain } from "@/components/dashboard/HoundBrain";
import { BeeStatusGrid } from "@/components/dashboard/BeeStatusGrid";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Hound Brain | CyberHound" };

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<span aria-hidden>🧠</span>}
        eyebrow="Colony OS · command uplink"
        title={
          <>
            Hound <span className="text-gradient">Brain</span>
          </>
        }
        subtitle="Queen Bee command center — orchestrate scouts, builders, and revenue from one place."
        actions={
          <div className="pill-live">
            <span className="pill-live__dot" />
            Hunting
          </div>
        }
      />

      <QuickStats />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:gap-8">
        <div className="space-y-6 xl:col-span-2 xl:space-y-8">
          <HoundBrain />
          <BeeStatusGrid />
        </div>
        <div className="xl:pt-0">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
