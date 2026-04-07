type LiveSearchResult = {
  url: string;
  title: string;
  description: string;
  provider: "firecrawl" | "apify";
  query?: string;
};

function hasValue(value: string | undefined | null): value is string {
  return !!value && value !== "placeholder" && !value.endsWith("-");
}

export function hasLiveSearchProvider() {
  return hasValue(process.env.FIRECRAWL_API_KEY) || hasValue(process.env.APIFY_API_TOKEN) || hasValue(process.env.APIFY_API_KEY);
}

export async function searchWeb(query: string, limit = 8): Promise<LiveSearchResult[]> {
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (hasValue(firecrawlKey)) {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firecrawlKey}`,
      },
      body: JSON.stringify({ query, limit }),
      cache: "no-store",
    });

    if (res.ok) {
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
  }

  const apifyToken = process.env.APIFY_API_TOKEN || process.env.APIFY_API_KEY;
  if (hasValue(apifyToken)) {
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
  }

  return [];
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
