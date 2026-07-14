/** Derive a believable product brand from campaign niche/copy. */

const STOP = new Set([
  "a", "an", "the", "for", "and", "or", "of", "to", "in", "on", "with", "via",
  "site", "upwork", "com", "gov", "ai", "powered", "automation", "software",
  "saas", "small", "mid", "market",
]);

export function brandFromNiche(niche: string, headline?: string | null): {
  brand: string;
  domain: string;
  initials: string;
} {
  const source = (headline || niche || "Product")
    .replace(/site:[^\s]+/gi, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim();

  const words = source
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()))
    .slice(0, 3);

  let brand: string;
  if (words.length >= 2) {
    // e.g. Medical Billing -> MediBill, OSHA Compliance -> OshaGuard style
    const a = words[0]!.replace(/ing$/i, "");
    const b = words[1]!;
    brand =
      a.length <= 6
        ? `${capitalize(a)}${capitalize(b.slice(0, 4))}`
        : `${capitalize(a.slice(0, 5))}${capitalize(b.slice(0, 3))}`;
  } else if (words.length === 1) {
    brand = `${capitalize(words[0]!.slice(0, 8))}HQ`;
  } else {
    brand = "Northline";
  }

  // Soft product-y suffixes for single-token brands
  if (brand.length < 6) brand = `${brand}ly`;

  const domain = `${brand.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
  const initials = brand.slice(0, 2).toUpperCase();

  return { brand, domain, initials };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function priceLabel(pricingDescription?: string | null): string {
  if (!pricingDescription) return "$149/mo";
  const m = pricingDescription.match(/\$\s*[\d,]+(?:\.\d+)?(?:\s*\/\s*mo(?:nth)?)?/i);
  if (m) {
    const raw = m[0].replace(/\s+/g, "");
    if (/\/mo/i.test(raw)) return raw;
    return `${raw}/mo`;
  }
  return pricingDescription.slice(0, 24);
}
