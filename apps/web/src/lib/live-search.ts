type LiveSearchResult = {
  url: string;
  title: string;
  description: string;
  provider: "firecrawl" | "apify" | "duckduckgo";
  query?: string;
};

function hasValue(value: string | undefined | null): value is string {
  return !!value && value !== "placeholder" && !value.endsWith("-");
}

/**
 * True when any search path can run (paid Firecrawl/Apify OR free DuckDuckGo fallback).
 * Hunt cron no longer hard-blocks without FIRECRAWL_API_KEY.
 */
export function hasLiveSearchProvider() {
  return true;
}

export function hasPaidSearchProvider() {
  return (
    hasValue(process.env.FIRECRAWL_API_KEY) ||
    hasValue(process.env.APIFY_API_TOKEN) ||
    hasValue(process.env.APIFY_API_KEY)
  );
}

async function searchDuckDuckGo(
  query: string,
  limit: number
): Promise<LiveSearchResult[]> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      AbstractURL?: string;
      AbstractText?: string;
      Heading?: string;
      RelatedTopics?: Array<
        | { Text?: string; FirstURL?: string }
        | { Topics?: Array<{ Text?: string; FirstURL?: string }> }
      >;
    };

    const out: LiveSearchResult[] = [];
    if (data.AbstractURL && (data.Heading || data.AbstractText)) {
      out.push({
        url: data.AbstractURL,
        title: data.Heading || query,
        description: data.AbstractText || "",
        provider: "duckduckgo",
        query,
      });
    }

    const flatten = (
      topics: typeof data.RelatedTopics
    ): Array<{ Text?: string; FirstURL?: string }> => {
      const rows: Array<{ Text?: string; FirstURL?: string }> = [];
      for (const t of topics ?? []) {
        if (t && "Topics" in t && Array.isArray(t.Topics)) {
          rows.push(...t.Topics);
        } else if (t && "FirstURL" in t) {
          rows.push(t);
        }
      }
      return rows;
    };

    for (const topic of flatten(data.RelatedTopics)) {
      if (!topic.FirstURL || !topic.Text) continue;
      const title = topic.Text.split(" - ")[0]?.slice(0, 120) || topic.Text.slice(0, 120);
      out.push({
        url: topic.FirstURL,
        title,
        description: topic.Text,
        provider: "duckduckgo",
        query,
      });
      if (out.length >= limit) break;
    }

    return out.slice(0, limit);
  } catch (e) {
    console.warn("[live-search] DuckDuckGo fallback failed:", e);
    return [];
  }
}

export async function searchWeb(query: string, limit = 8): Promise<LiveSearchResult[]> {
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (hasValue(firecrawlKey)) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firecrawlKey}`,
        },
        body: JSON.stringify({ query, limit }),
        cache: "no-store",
      });

      if (res.status === 402 || res.status === 429) {
        console.warn(`[live-search] Firecrawl ${res.status} — falling back`);
      } else if (res.ok) {
        const payload = await res.json();
        const items = Array.isArray(payload?.data) ? payload.data : [];
        const normalized = items
          .map((item: Record<string, unknown>) => ({
            url: String(item.url ?? ""),
            title: String(item.title ?? ""),
            description: String(item.description ?? ""),
            provider: "firecrawl" as const,
            query,
          }))
          .filter((item: LiveSearchResult) => item.url && item.title);
        if (normalized.length > 0) return normalized.slice(0, limit);
      }
    } catch (e) {
      console.warn("[live-search] Firecrawl error — falling back:", e);
    }
  }

  const apifyToken = process.env.APIFY_API_TOKEN || process.env.APIFY_API_KEY;
  if (hasValue(apifyToken)) {
    try {
      const res = await fetch(
        `https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            queries: query,
            maxPagesPerQuery: 1,
            resultsPerPage: Math.min(Math.max(limit, 1), 10),
            mobileResults: false,
            includeUnfilteredResults: false,
          }),
          cache: "no-store",
        }
      );

      if (res.ok) {
        const payload = await res.json();
        const rows = Array.isArray(payload) ? payload : [];
        const organic = rows.flatMap((row: Record<string, unknown>) =>
          Array.isArray(row.organicResults) ? row.organicResults : []
        );
        const normalized = organic
          .map((item: Record<string, unknown>) => ({
            url: String(item.url ?? ""),
            title: String(item.title ?? ""),
            description: String(item.description ?? ""),
            provider: "apify" as const,
            query,
          }))
          .filter((item: LiveSearchResult) => item.url && item.title);
        if (normalized.length > 0) return normalized.slice(0, limit);
      }
    } catch (e) {
      console.warn("[live-search] Apify error — falling back:", e);
    }
  }

  // Free fallback so colony can hunt without paid Firecrawl key
  return searchDuckDuckGo(query, limit);
}

export function buildSearchContext(results: LiveSearchResult[], maxSnippetLength = 500) {
  return results
    .map(
      (item) =>
        `[${item.provider}] ${item.title}\nURL: ${item.url}\nSnippet: ${item.description.slice(0, maxSnippetLength)}`
    )
    .join("\n\n---\n\n");
}

export type { LiveSearchResult };
