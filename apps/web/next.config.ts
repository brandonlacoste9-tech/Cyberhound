import type { NextConfig } from "next";
import path from "path";

/** Dev-only: allow loading /_next/* when you open the app by LAN IP (e.g. phone). Comma-separated. */
const allowedDevOrigins =
  process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
    .map((o) => o.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  /** Monorepo root so output file tracing ignores stray lockfiles outside this app. */
  outputFileTracingRoot: path.join(__dirname, "../.."),
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
