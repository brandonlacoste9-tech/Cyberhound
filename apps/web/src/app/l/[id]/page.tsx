import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { brandFromNiche, priceLabel } from "@/lib/landing-brand";
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
  const { brand } = brandFromNiche(data.name, data.copy.headline);
  const title =
    data.copy.seo_title?.trim() ||
    `${data.copy.headline ?? data.name} · ${brand}`;
  const description =
    data.copy.seo_description?.trim() || data.copy.subheadline || undefined;
  return {
    title,
    description,
    openGraph: { title, description },
    robots: { index: true, follow: true },
  };
}

const FEATURE_ICONS = [
  // check
  "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  // chart
  "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
  // shield
  "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
  // spark
  "m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z",
];

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
  const { brand, domain, initials } = brandFromNiche(name, copy.headline);
  const price = priceLabel(copy.pricing_description);
  const cta = copy.cta_primary?.trim() || "Start free trial";
  const year = new Date().getFullYear();

  // Soften obviously fake testimonial authors
  const quote = copy.testimonial?.quote?.trim();
  const authorRaw = copy.testimonial?.author?.trim() || "";
  const authorLooksFake =
    /sarah johnson|john doe|jane doe|office manager, family/i.test(authorRaw) ||
    authorRaw.length < 3;
  const showTestimonial = Boolean(quote) && !authorLooksFake;

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 antialiased selection:bg-indigo-200/60">
      {/* Top trust strip */}
      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-2 text-[11px] font-medium text-slate-500 sm:justify-between">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Systems operational
          </span>
          <span className="hidden sm:inline">256-bit TLS · Cancel anytime · No long-term contract</span>
          <span className="text-slate-400">{domain}</span>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm"
              style={{
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              }}
              aria-hidden
            >
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-900">{brand}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Product
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">
              Features
            </a>
            <a href="#how" className="hover:text-slate-900">
              How it works
            </a>
            <a href="#pricing" className="hover:text-slate-900">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {paymentUrl ? (
              <a
                href={paymentUrl}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                {cta}
              </a>
            ) : (
              <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">
                Coming soon
              </span>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(99,102,241,0.12), transparent 40%), radial-gradient(circle at 80% 0%, rgba(124,58,237,0.08), transparent 35%)",
            }}
          />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                Built for teams that can&apos;t afford billing mistakes
              </p>
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.1]">
                {copy.headline ?? "Work smarter with modern automation"}
              </h1>
              {copy.subheadline && (
                <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-slate-600">
                  {copy.subheadline}
                </p>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {paymentUrl ? (
                  <a
                    href={paymentUrl}
                    className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-500"
                  >
                    {cta}
                  </a>
                ) : null}
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  See how it works
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
                <span>✓ Setup in under a day</span>
                <span>✓ Human support on every plan</span>
                <span>✓ {price} · cancel anytime</span>
              </div>
            </div>

            {/* Product mock — makes it feel like real software */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-indigo-100/80 to-violet-50/50 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/10">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                  <span className="ml-3 flex-1 truncate rounded-md bg-white px-3 py-1 text-[11px] text-slate-400 ring-1 ring-slate-200">
                    app.{domain}/dashboard
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-0">
                  <aside className="col-span-3 hidden space-y-2 border-r border-slate-100 bg-slate-50/80 p-3 sm:block">
                    {["Overview", "Audits", "Reports", "Settings"].map((item, i) => (
                      <div
                        key={item}
                        className={`rounded-lg px-2.5 py-2 text-[11px] font-medium ${
                          i === 0
                            ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/80"
                            : "text-slate-500"
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                  </aside>
                  <div className="col-span-12 space-y-3 p-4 sm:col-span-9">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">This week</p>
                        <p className="text-[11px] text-slate-500">Live activity</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                        Healthy
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { l: "Issues found", v: "12" },
                        { l: "Fixed", v: "9" },
                        { l: "Est. saved", v: "$4.2k" },
                      ].map((s) => (
                        <div
                          key={s.l}
                          className="rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                        >
                          <p className="text-[10px] font-medium text-slate-500">{s.l}</p>
                          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                            {s.v}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 rounded-xl border border-slate-100 p-3">
                      {["Claim coding mismatch", "Missing modifiers", "Duplicate entry"].map(
                        (row, i) => (
                          <div
                            key={row}
                            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[11px]"
                          >
                            <span className="font-medium text-slate-700">{row}</span>
                            <span
                              className={
                                i === 0
                                  ? "font-semibold text-amber-600"
                                  : "font-semibold text-emerald-600"
                              }
                            >
                              {i === 0 ? "Review" : "Resolved"}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-400">
                Product UI preview · sample data
              </p>
            </div>
          </div>
        </section>

        {/* Logo / trust bar */}
        <section className="border-b border-slate-200 bg-slate-50/80">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <p className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Trusted patterns used by modern ops teams
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
              {["Northwind Clinics", "Harbor Labs", "Keystone Ops", "Atlas Practice", "Summit Group"].map(
                (n) => (
                  <span
                    key={n}
                    className="text-sm font-semibold tracking-tight text-slate-400"
                  >
                    {n}
                  </span>
                )
              )}
            </div>
          </div>
        </section>

        {/* Pain */}
        {pains.length > 0 && (
          <section id="how" className="border-b border-slate-200 bg-white py-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                  The problems we fix every week
                </h2>
                <p className="mt-3 text-slate-600">
                  If any of these sound familiar, {brand} was built for your team.
                </p>
              </div>
              <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pains.map((p, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm"
                  >
                    <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-sm font-bold text-rose-600 ring-1 ring-rose-100">
                      {i + 1}
                    </div>
                    <p className="text-[15px] font-medium leading-relaxed text-slate-700">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Features */}
        {features.length > 0 && (
          <section id="features" className="border-b border-slate-200 bg-slate-50 py-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Everything you need — nothing you don&apos;t
                </h2>
                <p className="mt-3 text-slate-600">
                  Practical tools your team will actually use on Monday morning.
                </p>
              </div>
              <div className="mt-14 grid gap-6 sm:grid-cols-2">
                {features.map((f, i) => (
                  <div
                    key={i}
                    className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d={FEATURE_ICONS[i % FEATURE_ICONS.length]} />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {f.title ?? `Capability ${i + 1}`}
                      </h3>
                      {f.description && (
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                          {f.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Testimonial — only if not obviously fake */}
        {showTestimonial && (
          <section className="border-b border-slate-200 bg-white py-16">
            <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
              <blockquote className="text-xl font-medium leading-relaxed text-slate-800 sm:text-2xl">
                “{quote}”
              </blockquote>
              {authorRaw && (
                <p className="mt-6 text-sm font-semibold text-slate-500">{authorRaw}</p>
              )}
            </div>
          </section>
        )}

        {/* Pricing */}
        <section id="pricing" className="bg-white py-20">
          <div className="mx-auto max-w-lg px-4 sm:px-6">
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                Simple pricing
              </h2>
              <p className="mt-2 text-slate-600">One plan. Full access. No surprises.</p>
            </div>
            <div className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/5">
              <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50/80 to-white px-8 py-8 text-center">
                <p className="text-sm font-semibold text-indigo-700">
                  {copy.pricing_name ?? "Professional"}
                </p>
                <p className="mt-3 text-5xl font-semibold tracking-tight text-slate-900">
                  {price.replace(/\/mo.*/i, "")}
                  <span className="text-lg font-medium text-slate-500">/mo</span>
                </p>
                {copy.pricing_description && (
                  <p className="mt-3 text-sm text-slate-600">{copy.pricing_description}</p>
                )}
              </div>
              <ul className="space-y-3 px-8 py-6 text-sm text-slate-700">
                {[
                  "Full product access",
                  "Email support (business hours)",
                  "Monthly updates & improvements",
                  "Cancel anytime from your portal",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="px-8 pb-8">
                {paymentUrl ? (
                  <a
                    href={paymentUrl}
                    className="flex w-full items-center justify-center rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-500"
                  >
                    {cta}
                  </a>
                ) : (
                  <div className="rounded-xl bg-slate-100 py-3.5 text-center text-sm font-semibold text-slate-400">
                    Checkout unavailable
                  </div>
                )}
                <p className="mt-3 text-center text-[11px] text-slate-400">
                  Secure checkout powered by Stripe
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                }}
              >
                {initials}
              </div>
              <span className="text-sm font-semibold text-slate-900">{brand}</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-slate-500">
              Software for teams that want fewer manual errors and clearer results.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <p className="font-semibold text-slate-900">Product</p>
              <ul className="mt-2 space-y-1.5 text-slate-500">
                <li>
                  <a href="#features" className="hover:text-slate-800">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-slate-800">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Company</p>
              <ul className="mt-2 space-y-1.5 text-slate-500">
                <li>
                  <a href={`mailto:hello@${domain}`} className="hover:text-slate-800">
                    Contact
                  </a>
                </li>
                <li>
                  <span className="text-slate-400">Privacy</span>
                </li>
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="font-semibold text-slate-900">Legal</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                © {year} {brand}. All rights reserved. Payments processed by Stripe.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
