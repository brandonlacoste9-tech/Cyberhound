import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { parseLandingCopy, type LandingCopy } from "@/types/landing-copy";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function loadCampaignLanding(id: string): Promise<{
  name: string;
  paymentUrl: string | null;
  copy: LandingCopy;
} | null> {
  const db = getSupabaseServer();
  const { data: campaign, error: cErr } = await db
    .from("campaigns")
    .select("id, name, stripe_payment_link")
    .eq("id", id)
    .maybeSingle();

  if (cErr || !campaign) return null;

  const { data: asset } = await db
    .from("assets")
    .select("content")
    .eq("campaign_id", id)
    .eq("type", "copy")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const copy = parseLandingCopy(asset?.content ?? null);
  if (!copy) return null;

  return {
    name: campaign.name,
    paymentUrl: campaign.stripe_payment_link ?? null,
    copy,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: "Not found" };
  const data = await loadCampaignLanding(id);
  if (!data) return { title: "Not found" };
  const title = data.copy.seo_title?.trim() || data.copy.headline || data.name;
  const description =
    data.copy.seo_description?.trim() || data.copy.subheadline || undefined;
  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function PublicLandingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const data = await loadCampaignLanding(id);
  if (!data) notFound();

  const { copy, paymentUrl, name } = data;
  const pains = Array.isArray(copy.pain_points) ? copy.pain_points : [];
  const features = Array.isArray(copy.features) ? copy.features : [];

  return (
    <div className="min-h-screen bg-[#050608] text-[#f4f4f7] antialiased selection:bg-[#f59e0b]/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[70%] h-[70%] rounded-full bg-[#f59e0b]/[0.03] blur-[120px]" />
        <div className="absolute top-[20%] -right-[15%] w-[60%] h-[60%] rounded-full bg-[#3b82f6]/[0.02] blur-[100px]" />
      </div>

      <header className="border-b border-white/[0.05] bg-[#050608]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[#f59e0b] to-[#fbbf24] shadow-[0_0_12px_rgba(245,158,11,0.4)]" />
            <span className="text-sm font-bold tracking-tight uppercase text-[#f4f4f7]">
              {name}
            </span>
          </div>
          {paymentUrl && (
            <a
              href={paymentUrl}
              className="rounded-full bg-white px-5 py-2 text-sm font-bold text-[#050608] transition hover:bg-[#f4f4f7] hover:scale-[1.02] active:scale-[0.98]"
            >
              {copy.cta_primary ?? "Get started"}
            </a>
          )}
        </div>
      </header>

      <main className="relative">
        {/* Hero Section */}
        <section className="mx-auto max-w-5xl px-6 pb-24 pt-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f59e0b]/20 bg-[#f59e0b]/[0.05] px-3 py-1 mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f59e0b] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f59e0b]"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#f59e0b]">
              Institutional Grade AI
            </span>
          </div>
          
          <h1 className="text-balance text-5xl font-extrabold tracking-tight sm:text-7xl leading-[1.1] text-white">
            {copy.headline ?? "Autonomous Infrastructure"}
          </h1>
          
          {copy.subheadline && (
            <p className="mx-auto mt-8 max-w-2xl text-pretty text-xl leading-relaxed text-[#9ca3b8] font-medium">
              {copy.subheadline}
            </p>
          )}

          <div className="mt-12 flex flex-wrap items-center justify-center gap-5">
            {paymentUrl ? (
              <a
                href={paymentUrl}
                className="group relative rounded-2xl bg-[#f59e0b] px-8 py-4 text-lg font-bold text-[#050608] shadow-[0_0_50px_rgba(245,158,11,0.2)] transition-all hover:scale-[1.03] hover:shadow-[0_0_60px_rgba(245,158,11,0.3)]"
              >
                {copy.cta_primary ?? "Secure Access Now"}
              </a>
            ) : (
              <span className="rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-4 text-lg font-bold text-[#5c6478]">
                {copy.cta_primary ?? "Waitlist Active"}
              </span>
            )}
            {copy.cta_secondary && (
              <button className="rounded-2xl border border-white/10 bg-white/[0.02] px-8 py-4 text-lg font-bold text-[#f4f4f7] backdrop-blur-sm transition hover:bg-white/[0.05]">
                {copy.cta_secondary}
              </button>
            )}
          </div>
        </section>

        {/* Pains Grid */}
        {pains.length > 0 && (
          <section className="relative py-24 bg-[#0a0c10]/50 border-y border-white/[0.04]">
            <div className="mx-auto max-w-6xl px-6">
              <div className="text-center mb-16">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#5c6478]">The Efficiency Gap</h2>
                <p className="mt-2 text-3xl font-bold text-white">Why manual systems fail</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pains.map((p, i) => (
                  <div
                    key={i}
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-[#f59e0b]/20"
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center text-[10px] text-[#f59e0b] font-bold">
                        {i + 1}
                      </div>
                      <p className="text-[#9ca3b8] leading-relaxed font-medium">{p}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Features Overhaul */}
        {features.length > 0 && (
          <section className="mx-auto max-w-6xl px-6 py-32">
            <div className="flex flex-col items-center text-center mb-20">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#f59e0b]">System Architecture</h2>
              <p className="mt-2 text-4xl font-extrabold text-white">Engineered for Sovereignty</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="group relative w-full sm:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)] rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent p-10 shadow-2xl transition-all hover:translate-y-[-8px] hover:border-[#f59e0b]/30"
                >
                  <div className="mb-6 inline-flex p-3 rounded-2xl bg-[#f59e0b]/10 text-[#f59e0b] group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    {f.title ?? `Module ${i + 1}`}
                  </h3>
                  {f.description && (
                    <p className="text-[#9ca3b8] leading-relaxed text-lg font-medium">
                      {f.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Testimonial / Trust */}
        {copy.testimonial?.quote && (
          <section className="mx-auto max-w-4xl px-6 py-24 text-center">
            <div className="mb-10 text-[#f59e0b]/40">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C14.9124 8 14.017 7.10457 14.017 6V5C14.017 3.89543 14.9124 3 16.017 3H19.017C21.2261 3 23.017 4.79086 23.017 7V15C23.017 18.3137 20.3307 21 17.017 21H14.017ZM1.017 21L1.017 18C1.017 16.8954 1.91243 16 3.017 16H6.017C6.56928 16 7.017 15.5523 7.017 15V9C7.017 8.44772 6.56928 8 6.017 8H3.017C1.91243 8 1.017 7.10457 1.017 6V5C1.017 3.89543 1.91243 3 3.017 3H6.017C8.22614 3 10.017 4.79086 10.017 7V15C10.017 18.3137 7.33071 21 4.017 21H1.017Z" /></svg>
            </div>
            <blockquote className="text-3xl font-bold text-white tracking-tight leading-[1.3] sm:text-4xl">
              &ldquo;{copy.testimonial.quote}&rdquo;
            </blockquote>
            {copy.testimonial.author && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <div className="w-10 h-px bg-white/10" />
                <p className="text-sm font-bold uppercase tracking-widest text-[#5c6478]">
                  {copy.testimonial.author}
                </p>
                <div className="w-10 h-px bg-white/10" />
              </div>
            )}
          </section>
        )}

        {/* Pricing / Final CTA */}
        {(copy.pricing_name || copy.pricing_description) && (
          <section className="px-6 py-32 bg-[#050608]">
            <div className="mx-auto max-w-2xl relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
              <div className="relative rounded-[2rem] border border-white/[0.06] bg-[#0a0c10] p-12 text-center shadow-3xl">
                <h2 className="text-2xl font-bold text-white mb-4">
                  {copy.pricing_name ?? "Enterprise License"}
                </h2>
                {copy.pricing_description && (
                  <p className="text-[#9ca3b8] text-lg font-medium mb-10">{copy.pricing_description}</p>
                )}
                {paymentUrl && (
                  <a
                    href={paymentUrl}
                    className="inline-flex items-center justify-center w-full sm:w-auto min-w-[240px] rounded-2xl bg-white px-8 py-5 text-lg font-extrabold text-[#050608] transition hover:bg-[#f4f4f7] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Deploy to Infrastructure
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        <footer className="border-t border-white/[0.05] py-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#3d4456]">
              Verified by CyberHound Colony OS
            </p>
          </div>
        </footer>
      </main>
    </div>
      </main>
    </div>
  );
}
