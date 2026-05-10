import type { NextRequest } from "next/server";

/** Absolute site origin from raw Headers (e.g. inside cron handlers). */
export function publicOriginFromHeaders(headers: Headers): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const forwarded = headers.get("x-forwarded-host");
  const host = forwarded ?? headers.get("host");
  if (host) {
    const proto = headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return "https://cyberhound.vercel.app";
}

/** Absolute site origin for public URLs (landing pages, webhooks). */
export function publicOriginFromRequest(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const forwarded = req.headers.get("x-forwarded-host");
  const host = forwarded ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? "http";
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  try {
    return new URL(req.url).origin.replace(/\/$/, "");
  } catch {
    return "http://localhost:3000";
  }
}
