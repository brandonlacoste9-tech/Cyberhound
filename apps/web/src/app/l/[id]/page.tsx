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
    <div className="min-h-screen bg-[#050608] text-[#f4f4f7] antialiased">
      <header className="border-b border-white/[0.08] bg-[#0a0c10]/90 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <span className="text-sm font-semibold tracking-tight text-[#f59e0b]">
            {name}
          </span>
          {paymentUrl ? (
            <a
              href={paymentUrl}
              className="rounded-lg bg-[#f59e0b] px-4 py-2 text-sm font-semibold text-[#050608] shadow-[0_0_24px_rgba(245,158,11,0.2)] transition hover:bg-[#fbbf24]"
            >
              {copy.cta_primary ?? "Get started"}
            </a>
          ) : (
            <span className="text-xs text-[#5c6478]">CyberHound · Builder Bee</span>
          )}
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-5 pb-16 pt-14 text-center">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-[#f59e0b]/90">
            Built with CyberHound
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            {copy.headline ?? "Your product"}
          </h1>
          {copy.subheadline && (
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-[#9ca3b8]">
              {copy.subheadline}
            </p>
          )}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {paymentUrl ? (
              <a
                href={paymentUrl}
                className="rounded-xl bg-[#f59e0b] px-6 py-3 text-base font-semibold text-[#050608] shadow-[0_0_40px_rgba(245,158,11,0.15)] transition hover:bg-[#fbbf24]"
              >
                {copy.cta_primary ?? "Get started"}
              </a>
            ) : (
              <span className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-base font-medium text-[#9ca3b8]">
                {copy.cta_primary ?? "Coming soon"}
              </span>
            )}
            {copy.cta_secondary && (
              <Link
                href="/"
                className="rounded-xl border border-white/15 px-6 py-3 text-base font-medium text-[#f4f4f7] transition hover:bg-white/[0.06]"
              >
                {copy.cta_secondary}
              </Link>
            )}
          </div>
        </section>

        {pains.length > 0 && (
          <section className="border-y border-white/[0.06] bg-[#0a0c10] py-16">
            <div className="mx-auto max-w-5xl px-5">
              <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-[#5c6478]">
                Pain points we solve
              </h2>
              <ul className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-1">
                {pains.map((p, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-[#9ca3b8]"
                  >
                    <span className="mt-0.5 text-[#f59e0b]" aria-hidden>
                      ◆
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {features.length > 0 && (
          <section className="mx-auto max-w-5xl px-5 py-16">
            <h2 className="text-center text-2xl font-bold">What you get</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
                >
                  <h3 className="text-lg font-semibold text-[#f4f4f7]">
                    {f.title ?? `Feature ${i + 1}`}
                  </h3>
                  {f.description && (
                    <p className="mt-2 text-sm leading-relaxed text-[#9ca3b8]">
                      {f.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {(copy.pricing_name || copy.pricing_description) && (
          <section className="border-t border-white/[0.06] bg-gradient-to-b from-[#0e1118] to-[#050608] py-16">
            <div className="mx-auto max-w-lg rounded-2xl border border-[#f59e0b]/25 bg-[#0a0c10] p-8 text-center shadow-[0_0_40px_rgba(245,158,11,0.08)]">
              <h2 className="text-xl font-bold text-[#fbbf24]">
                {copy.pricing_name ?? "Simple pricing"}
              </h2>
              {copy.pricing_description && (
                <p className="mt-3 text-[#9ca3b8]">{copy.pricing_description}</p>
              )}
              {paymentUrl && (
                <a
                  href={paymentUrl}
                  className="mt-6 inline-block rounded-xl bg-[#10b981] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#34d399]"
                >
                  {copy.cta_primary ?? "Subscribe"}
                </a>
              )}
            </div>
          </section>
        )}

        {copy.testimonial?.quote && (
          <section className="mx-auto max-w-3xl px-5 py-16 text-center">
            <blockquote className="text-lg italic text-[#9ca3b8] sm:text-xl">
              &ldquo;{copy.testimonial.quote}&rdquo;
            </blockquote>
            {copy.testimonial.author && (
              <p className="mt-4 text-sm font-medium text-[#5c6478]">
                — {copy.testimonial.author}
              </p>
            )}
          </section>
        )}

        <footer className="border-t border-white/[0.06] py-8 text-center text-xs text-[#3d4456]">
          <p>Powered by CyberHound Colony OS</p>
        </footer>
      </main>
    </div>
  );
}
