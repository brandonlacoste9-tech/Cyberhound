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
    `${data.copy.headline ?? data.name} | ${brand}`;
  const description =
    data.copy.seo_description?.trim() || data.copy.subheadline || undefined;
  return { title, description, openGraph: { title, description } };
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
  const pains = (Array.isArray(copy.pain_points) ? copy.pain_points : []).slice(0, 3);
  const features = (Array.isArray(copy.features) ? copy.features : []).slice(0, 4);
  const { brand, initials, tagline } = brandFromNiche(name, copy.headline);
  const { amount, period, detail } = priceLabel(copy.pricing_description);
  const cta = copy.cta_primary?.trim() || "Get started";
  const year = new Date().getFullYear();

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        margin: 0,
        background: "#ffffff",
        color: "#0f172a",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Nav */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            padding: "0 24px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "#0f172a",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              {initials}
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em" }}>
              {brand}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <a
              href="#features"
              style={{ fontSize: 14, color: "#475569", textDecoration: "none", fontWeight: 500 }}
            >
              Product
            </a>
            <a
              href="#pricing"
              style={{ fontSize: 14, color: "#475569", textDecoration: "none", fontWeight: 500 }}
            >
              Pricing
            </a>
            {paymentUrl ? (
              <a
                href={paymentUrl}
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#fff",
                  background: "#0f172a",
                  padding: "9px 16px",
                  borderRadius: 8,
                  textDecoration: "none",
                }}
              >
                {cta}
              </a>
            ) : null}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ width: "100%", background: "#fff" }}>
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "72px 24px 40px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: "0 0 20px",
              fontSize: 13,
              fontWeight: 500,
              color: "#64748b",
              letterSpacing: "0.01em",
            }}
          >
            {tagline}
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              fontWeight: 650,
              letterSpacing: "-0.035em",
              lineHeight: 1.12,
              color: "#0f172a",
            }}
          >
            {copy.headline ?? "Fewer errors. Clearer results."}
          </h1>
          {copy.subheadline ? (
            <p
              style={{
                margin: "20px auto 0",
                maxWidth: 540,
                fontSize: 18,
                lineHeight: 1.6,
                color: "#475569",
                fontWeight: 400,
              }}
            >
              {copy.subheadline}
            </p>
          ) : null}

          <div
            style={{
              marginTop: 32,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {paymentUrl ? (
              <a
                href={paymentUrl}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 160,
                  padding: "14px 22px",
                  borderRadius: 10,
                  background: "#4f46e5",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "0 1px 2px rgba(15,23,42,0.08), 0 8px 24px rgba(79,70,229,0.25)",
                }}
              >
                {cta}
              </a>
            ) : null}
            <a
              href="#features"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 140,
                padding: "14px 22px",
                borderRadius: 10,
                background: "#fff",
                color: "#0f172a",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                border: "1px solid #e2e8f0",
              }}
            >
              Learn more
            </a>
          </div>

          <p style={{ marginTop: 18, fontSize: 13, color: "#94a3b8" }}>
            {amount}
            {period} · Cancel anytime · Card payments by Stripe
          </p>
        </div>

        {/* Product frame */}
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 24px 80px" }}>
          <div
            style={{
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              background: "#fff",
              boxShadow:
                "0 0 0 1px rgba(15,23,42,0.02), 0 20px 50px -20px rgba(15,23,42,0.18)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: 44,
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
                gap: 8,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#cbd5e1" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#cbd5e1" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#cbd5e1" }} />
              <div
                style={{
                  marginLeft: 8,
                  flex: 1,
                  height: 28,
                  borderRadius: 6,
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: "#94a3b8",
                }}
              >
                app.{brand.toLowerCase()}.com
              </div>
            </div>
            <div
              className="lp-product-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 200px) 1fr",
                minHeight: 320,
              }}
            >
              <div
                style={{
                  borderRight: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  padding: 16,
                }}
              >
                {["Dashboard", "Reviews", "Reports", "Team", "Settings"].map((item, i) => (
                  <div
                    key={item}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: i === 0 ? 600 : 500,
                      color: i === 0 ? "#0f172a" : "#64748b",
                      background: i === 0 ? "#fff" : "transparent",
                      boxShadow: i === 0 ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
                      marginBottom: 4,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ padding: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
                      Weekly summary
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                      Last 7 days
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#047857",
                      background: "#ecfdf5",
                      padding: "4px 10px",
                      borderRadius: 999,
                    }}
                  >
                    On track
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  {[
                    { label: "Items reviewed", value: "148" },
                    { label: "Flags opened", value: "11" },
                    { label: "Resolved", value: "9" },
                  ].map((card) => (
                    <div
                      key={card.label}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: 14,
                        background: "#fff",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#64748b" }}>{card.label}</div>
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 650,
                          letterSpacing: "-0.03em",
                          marginTop: 6,
                          color: "#0f172a",
                        }}
                      >
                        {card.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  {[
                    ["Missing supporting note", "Open"],
                    ["Duplicate line item", "Resolved"],
                    ["Out-of-date code set", "Resolved"],
                  ].map(([title, status], i) => (
                    <div
                      key={title}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 14px",
                        borderTop: i === 0 ? "none" : "1px solid #f1f5f9",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: "#334155", fontWeight: 500 }}>{title}</span>
                      <span
                        style={{
                          color: status === "Open" ? "#b45309" : "#047857",
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      {pains.length > 0 && (
        <section
          style={{
            width: "100%",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            borderBottom: "1px solid #e2e8f0",
            padding: "72px 0",
          }}
        >
          <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 24px" }}>
            <h2
              style={{
                margin: "0 0 12px",
                textAlign: "center",
                fontSize: 28,
                fontWeight: 650,
                letterSpacing: "-0.03em",
                color: "#0f172a",
              }}
            >
              Why teams switch
            </h2>
            <p
              style={{
                margin: "0 auto 40px",
                textAlign: "center",
                maxWidth: 480,
                color: "#64748b",
                fontSize: 16,
                lineHeight: 1.6,
              }}
            >
              Common friction we hear from operators — and the reason {brand} exists.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              {pains.map((p, i) => (
                <div
                  key={i}
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    padding: 22,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "#f1f5f9",
                      color: "#475569",
                      fontSize: 13,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    {i + 1}
                  </div>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "#334155", fontWeight: 500 }}>
                    {p}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      {features.length > 0 && (
        <section
          id="features"
          style={{ width: "100%", background: "#fff", padding: "72px 0" }}
        >
          <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 24px" }}>
            <h2
              style={{
                margin: "0 0 12px",
                textAlign: "center",
                fontSize: 28,
                fontWeight: 650,
                letterSpacing: "-0.03em",
              }}
            >
              What you get
            </h2>
            <p
              style={{
                margin: "0 auto 40px",
                textAlign: "center",
                maxWidth: 440,
                color: "#64748b",
                fontSize: 16,
              }}
            >
              Focused capabilities — not a bloated suite you&apos;ll never open.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {features.map((f, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    padding: 24,
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "#eef2ff",
                      color: "#4338ca",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </div>
                  <h3
                    style={{
                      margin: "0 0 8px",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#0f172a",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {f.title ?? `Feature ${i + 1}`}
                  </h3>
                  {f.description ? (
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#64748b" }}>
                      {f.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing */}
      <section
        id="pricing"
        style={{
          width: "100%",
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          padding: "72px 24px 88px",
        }}
      >
        <div style={{ maxWidth: 420, margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: 28,
              fontWeight: 650,
              letterSpacing: "-0.03em",
            }}
          >
            Pricing
          </h2>
          <p style={{ margin: "0 0 28px", color: "#64748b", fontSize: 15 }}>
            Straightforward monthly plan.
          </p>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: "32px 28px",
              boxShadow: "0 10px 40px -20px rgba(15,23,42,0.15)",
              textAlign: "left",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#4f46e5" }}>
                {copy.pricing_name ?? "Professional"}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 48,
                  fontWeight: 650,
                  letterSpacing: "-0.04em",
                  color: "#0f172a",
                  lineHeight: 1,
                }}
              >
                {amount}
                <span style={{ fontSize: 16, fontWeight: 500, color: "#64748b" }}>
                  {period}
                </span>
              </div>
              <p style={{ margin: "12px 0 0", fontSize: 14, color: "#64748b" }}>{detail}</p>
            </div>

            <ul
              style={{
                listStyle: "none",
                margin: "0 0 24px",
                padding: 0,
                display: "grid",
                gap: 10,
              }}
            >
              {[
                "Full access to the product",
                "Email support on business days",
                "Ongoing product updates",
                "Cancel from your billing portal",
              ].map((item) => (
                <li
                  key={item}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    fontSize: 14,
                    color: "#334155",
                  }}
                >
                  <span style={{ color: "#16a34a", fontWeight: 700, lineHeight: 1.4 }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {paymentUrl ? (
              <a
                href={paymentUrl}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 10,
                  background: "#4f46e5",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: "none",
                  boxSizing: "border-box",
                }}
              >
                {cta}
              </a>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: 14,
                  borderRadius: 10,
                  background: "#f1f5f9",
                  color: "#94a3b8",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Checkout unavailable
              </div>
            )}
            <p
              style={{
                margin: "14px 0 0",
                textAlign: "center",
                fontSize: 12,
                color: "#94a3b8",
              }}
            >
              Payments secured by Stripe
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          width: "100%",
          borderTop: "1px solid #e2e8f0",
          background: "#fff",
          padding: "40px 24px 48px",
        }}
      >
        <div
          style={{
            maxWidth: 920,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: "#0f172a",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {initials}
            </div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{brand}</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b", maxWidth: 360 }}>
            {tagline}.
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            © {year} {brand}. All rights reserved.
          </p>
        </div>
      </footer>

      <style>{`
        @media (max-width: 720px) {
          .lp-product-grid {
            grid-template-columns: 1fr !important;
          }
          .lp-product-grid > div:first-child {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
