"use client";

import { useEffect, useState } from "react";
import { createClient } from "./client";

export type BrowserSupabase = ReturnType<typeof createClient>;

export function useSupabaseBrowser(): {
  client: BrowserSupabase | null;
  error: string | null;
  /** True after the mount effect has run (client may still be null if misconfigured). */
  mounted: boolean;
} {
  const [client, setClient] = useState<BrowserSupabase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      setClient(createClient());
      setError(null);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not initialize Supabase in the browser.";
      setError(message);
      setClient(null);
    } finally {
      setMounted(true);
    }
  }, []);

  return { client, error, mounted };
}
