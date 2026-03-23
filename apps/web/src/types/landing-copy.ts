import type { Json } from "@/types/database";

export interface LandingFeature {
  title?: string;
  description?: string;
}

export interface LandingTestimonial {
  quote?: string;
  author?: string;
}

/** Builder Bee JSON shape stored in `assets.content` (type `copy`). */
export interface LandingCopy {
  headline?: string;
  subheadline?: string;
  pain_points?: string[];
  features?: LandingFeature[];
  testimonial?: LandingTestimonial;
  cta_primary?: string;
  cta_secondary?: string;
  pricing_name?: string;
  pricing_description?: string;
  seo_title?: string;
  seo_description?: string;
}

export function parseLandingCopy(json: Json): LandingCopy | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  return json as LandingCopy;
}
