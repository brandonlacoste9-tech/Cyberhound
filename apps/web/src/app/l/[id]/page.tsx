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
  "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
  "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
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
  const priceMain = price.replace(/\/mo.*/i, "").trim() || "$149";
  const cta = copy.cta_primary?.trim() || "Start free trial";
  const year = new Date().getFullYear();

  const quote = copy.testimonial?.quote?.trim();
  const authorRaw = copy.testimonial?.author?.trim() || "";
  const authorLooksFake =
    /sarah johnson|john doe|jane doe|office manager, family/i.test(authorRaw) ||
    authorRaw.length < 3;
  const showTestimonial = Boolean(quote) && !authorLooksFake;

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900">
      {/* Top bar — full width, content centered */}
      <div className="w-full border-b border-slate-200 bg-white">
        <div className="lp-wrap flex flex-wrap items-center justify-center gap-x-5 gap-y-1 py-2.5 text-center text-[11px] font-medium text-slate-500 sm:justify-between sm:text-left">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Systems operational
          </span>
          <span className="hidden text-slate-400 sm:inline">
            Secure checkout · Cancel anytime
          </span>
          <span className="text-slate-400">{domain}</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="lp-wrap flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
            >
              {initials}
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900">
              {brand}
            </span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">
              Features
            </a>
            <a href="#pricing" className="hover:text-slate-900">
              Pricing
            </a>
          </nav>
          {paymentUrl ? (
            <a
              href={paymentUrl}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {cta}
            </a>
          ) : (
            <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">
              Soon
            </span>
          )}
        </div>
      </header>

      <main className="w-full">
        {/* HERO — fully centered stack */}
        <section className="w-full border-b border-slate-200 bg-white">
          <div className="lp-wrap flex flex-col items-center py-14 text-center sm:py-20">
            <p className="mb-5 inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-3.5 py-1 text-xs font-semibold text-indigo-700">
              Built for teams that need fewer errors
            </p>

            <h1 className="mx-auto max-w-3xl text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.12]">
              {copy.headline ?? "Work smarter with modern automation"}
            </h1>

            {copy.subheadline && (
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
                {copy.subheadline}
              </p>
            )}

            <div className="mt-8 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
              {paymentUrl ? (
                <a
                  href={paymentUrl}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500"
                >
                  {cta}
                </a>
              ) : null}
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                See features
              </a>
            </div>

            <p className="mt-5 text-xs font-medium text-slate-500">
              {priceMain}/mo · Setup in a day · Cancel anytime
            </p>

            {/* Product mock — centered under copy */}
            <div className="mx-auto mt-12 w-full max-w-3xl">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xl shadow-slate-900/10">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
                  <span className="ml-2 flex-1 truncate rounded-md bg-white px-3 py-1 text-center text-[11px] text-slate-400 ring-1 ring-slate-200">
                    app.{domain}/dashboard
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12">
                  <aside className="hidden space-y-1.5 border-r border-slate-100 bg-slate-50/90 p-3 sm:col-span-3 sm:block">
                    {["Overview", "Audits", "Reports", "Settings"].map((item, i) => (
                      <div
                        key={item}
                        className={`rounded-lg px-2.5 py-2 text-[11px] font-medium ${
                          i === 0
                            ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                            : "text-slate-500"
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                  </aside>
                  <div className="space-y-3 p-4 sm:col-span-9">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">This week</p>
                        <p className="text-[11px] text-slate-500">Sample activity</p>
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
                          className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center"
                        >
                          <p className="text-[10px] font-medium text-slate-500">{s.l}</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{s.v}</p>
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
              <p className="mt-2 text-center text-[11px] text-slate-400">
                Product preview · illustrative data
              </p>
            </div>
          </div>
        </section>

        {/* Logos */}
        <section className="w-full border-b border-slate-200 bg-slate-50">
          <div className="lp-wrap py-10 text-center">
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Patterns used by modern ops teams
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {["Northwind Clinics", "Harbor Labs", "Keystone Ops", "Atlas Practice", "Summit Group"].map(
                (n) => (
                  <span key={n} className="text-sm font-semibold text-slate-400">
                    {n}
                  </span>
                )
              )}
            </div>
          </div>
        </section>

        {/* Pains */}
        {pains.length > 0 && (
          <section className="w-full border-b border-slate-200 bg-white py-16 sm:py-20">
            <div className="lp-wrap">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  The problems we fix every week
                </h2>
                <p className="mt-3 text-slate-600">
                  If these sound familiar, {brand} was built for your team.
                </p>
              </div>
              <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
                {pains.slice(0, 3).map((p, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center shadow-sm"
                  >
                    <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-sm font-bold text-rose-600 ring-1 ring-rose-100">
                      {i + 1}
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-slate-700">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Features */}
        {features.length > 0 && (
          <section id="features" className="w-full border-b border-slate-200 bg-slate-50 py-16 sm:py-20">
            <div className="lp-wrap">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Everything you need
                </h2>
                <p className="mt-3 text-slate-600">
                  Practical tools your team will use on Monday morning.
                </p>
              </div>
              <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
                {features.map((f, i) => (
                  <div
                    key={i}
                    className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d={FEATURE_ICONS[i % FEATURE_ICONS.length]}
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {f.title ?? `Feature ${i + 1}`}
                      </h3>
                      {f.description && (
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
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

        {showTestimonial && (
          <section className="w-full border-b border-slate-200 bg-white py-14">
            <div className="lp-wrap-narrow text-center">
              <blockquote className="text-lg font-medium leading-relaxed text-slate-800 sm:text-xl">
                “{quote}”
              </blockquote>
              {authorRaw && (
                <p className="mt-5 text-sm font-semibold text-slate-500">{authorRaw}</p>
              )}
            </div>
          </section>
        )}

        {/* Pricing — centered card */}
        <section id="pricing" className="w-full bg-white py-16 sm:py-20">
          <div className="lp-wrap flex flex-col items-center">
            <div className="w-full max-w-md text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Simple pricing
              </h2>
              <p className="mt-2 text-slate-600">One plan. Full access.</p>
            </div>

            <div className="mt-8 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white text-center shadow-xl shadow-slate-900/5">
              <div className="border-b border-slate-100 bg-gradient-to-b from-indigo-50 to-white px-6 py-8">
                <p className="text-sm font-semibold text-indigo-700">
                  {copy.pricing_name ?? "Professional"}
                </p>
                <p className="mt-2 text-5xl font-semibold tracking-tight text-slate-900">
                  {priceMain}
                  <span className="text-lg font-medium text-slate-500">/mo</span>
                </p>
                {copy.pricing_description && (
                  <p className="mt-3 text-sm text-slate-600">{copy.pricing_description}</p>
                )}
              </div>
              <ul className="space-y-3 px-8 py-6 text-left text-sm text-slate-700">
                {[
                  "Full product access",
                  "Email support (business hours)",
                  "Monthly updates",
                  "Cancel anytime",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="px-6 pb-8">
                {paymentUrl ? (
                  <a
                    href={paymentUrl}
                    className="flex w-full items-center justify-center rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
                  >
                    {cta}
                  </a>
                ) : (
                  <div className="rounded-xl bg-slate-100 py-3.5 text-sm font-semibold text-slate-400">
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

      <footer className="w-full border-t border-slate-200 bg-slate-50">
        <div className="lp-wrap flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold text-white"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
            >
              {initials}
            </div>
            <span className="text-sm font-semibold text-slate-900">{brand}</span>
          </div>
          <p className="max-w-sm text-sm text-slate-500">
            Software for teams that want fewer manual errors and clearer results.
          </p>
          <p className="text-xs text-slate-400">
            © {year} {brand}. Payments by Stripe.
          </p>
        </div>
      </footer>
    </div>
  );
}
