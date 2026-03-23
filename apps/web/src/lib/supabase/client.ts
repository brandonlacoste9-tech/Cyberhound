import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy apps/web/.env.local.example to .env.local."
    );
  }
  // Third generic: hand-written `Database` omits details required for `GenericSchema` inference;
  // without `any` here, `Schema` becomes `never` and `.from()` breaks (supabase-js ≥2.99).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema generic workaround for supabase-js
  return createBrowserClient<Database, "public", any>(url, anonKey);
}
