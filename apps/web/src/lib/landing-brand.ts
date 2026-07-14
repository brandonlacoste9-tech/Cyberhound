/** Product brand helpers for public campaign landings. */

const STOP = new Set([
  "a", "an", "the", "for", "and", "or", "of", "to", "in", "on", "with", "via",
  "site", "upwork", "com", "gov", "ai", "powered", "automation", "software",
  "saas", "small", "mid", "market", "european", "smes", "startups", "startup",
]);

/** Clean product-style names (not meme compounds). */
const VERTICAL_BRANDS: Array<{ test: RegExp; brand: string; tagline: string }> = [
  {
    test: /billing|claim|medical|clinic|hipaa|practice/i,
    brand: "Ledgerly",
    tagline: "Medical billing clarity for small practices",
  },
  {
    test: /osha|safety|manufactur|300a|violation/i,
    brand: "SiteReady",
    tagline: "Safety paperwork that stays audit-ready",
  },
  {
    test: /real estate|property|contract review|landlord/i,
    brand: "Clause",
    tagline: "Contract review for property teams",
  },
  {
    test: /soc\s*2|iso|27001|gdpr|compliance automation|audit-ready/i,
    brand: "Controlroom",
    tagline: "Evidence and controls for growing SaaS",
  },
];

export function brandFromNiche(niche: string, headline?: string | null): {
  brand: string;
  domain: string;
  initials: string;
  tagline: string;
} {
  for (const row of VERTICAL_BRANDS) {
    if (row.test.test(niche) || (headline && row.test.test(headline))) {
      return {
        brand: row.brand,
        domain: `${row.brand.toLowerCase()}.com`,
        initials: row.brand.slice(0, 2).toUpperCase(),
        tagline: row.tagline,
      };
    }
  }

  const source = (headline || niche || "Product")
    .replace(/site:[^\s]+/gi, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim();

  const words = source
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()))
    .slice(0, 2);

  const brand =
    words.length >= 1
      ? capitalize(words[0]!.replace(/(ing|tion|ment)$/i, "").slice(0, 8))
      : "Northline";

  return {
    brand,
    domain: `${brand.toLowerCase()}.com`,
    initials: brand.slice(0, 2).toUpperCase(),
    tagline: "Software that stays out of the way",
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function priceLabel(pricingDescription?: string | null): {
  amount: string;
  period: string;
  detail: string;
} {
  const detail = pricingDescription?.trim() || "Includes product access and email support";
  const m = pricingDescription?.match(/\$\s*([\d,]+)/);
  const amount = m ? `$${m[1]}` : "$149";
  return { amount, period: "/month", detail };
}
