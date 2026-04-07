/**
 * CyberHound — Apollo Enrichment Bee
 *
 * Takes a company name (or domain) and returns:
 *   - CEO / decision-maker name
 *   - Verified email
 *   - LinkedIn URL
 *   - Company metadata (size, industry, location)
 *
 * Uses Apollo.io People Search + Organization Search APIs.
 * Real data only: no guessed emails, no synthetic contacts.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendHiveUpdate } from "@/lib/telegram/notify";

// ── Apollo API helpers ────────────────────────────────────────────────────────

const APOLLO_BASE = "https://api.apollo.io/api/v1";

interface ApolloContact {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  email: string | null;
  linkedin_url: string | null;
  organization_name: string;
  organization?: {
    name: string;
    website_url: string;
    industry: string;
    estimated_num_employees: number;
    city: string;
    country: string;
  };
}

interface EnrichmentResult {
  lead_id?: string;
  company: string;
  domain?: string;
  contact_name: string;
  contact_title: string;
  contact_email: string | null;
  contact_linkedin: string | null;
  company_size?: number;
  company_industry?: string;
  company_location?: string;
  enrichment_source: "apollo";
  confidence: "high" | "medium" | "low";
}

async function apolloSearchPeople(
  company: string,
  domain?: string
): Promise<ApolloContact | null> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return null;

  // Target decision-maker titles
  const titles = [
    "CEO",
    "Founder",
    "Co-Founder",
    "CTO",
    "Head of Engineering",
    "VP Engineering",
    "Director of Technology",
    "Owner",
  ];

  try {
    const body: Record<string, unknown> = {
      api_key: apiKey,
      q_organization_name: company,
      person_titles: titles,
      page: 1,
      per_page: 5,
      contact_email_status: ["verified", "likely to engage"],
    };

    if (domain) {
      body.q_organization_domains = [domain];
    }

    const res = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Enrich] Apollo people search error:", res.status, err);
      return null;
    }

    const data = await res.json();
    const people: ApolloContact[] = data.people ?? data.contacts ?? [];

    // Prefer CEO/Founder, then take first result
    const ceo = people.find((p) =>
      ["ceo", "founder", "co-founder", "owner"].some((t) =>
        p.title?.toLowerCase().includes(t)
      )
    );

    return ceo ?? people[0] ?? null;
  } catch (e) {
    console.error("[Enrich] Apollo fetch error:", e);
    return null;
  }
}

// ── Domain helper ────────────────────────────────────────────────────────────

function extractDomain(company: string): string | null {
  // Try to guess domain from company name
  const cleaned = company
    .toLowerCase()
    .replace(/\s+(inc|llc|ltd|corp|co|company|technologies|tech|solutions|group|agency)\.?$/i, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  return cleaned ? `${cleaned}.com` : null;
}

// ── Main enrichment function ──────────────────────────────────────────────────

async function enrichLead(
  company: string,
  domain?: string,
  leadId?: string
): Promise<EnrichmentResult> {
  const resolvedDomain = domain ?? extractDomain(company) ?? undefined;

  // Try Apollo first
  const contact = await apolloSearchPeople(company, resolvedDomain);

  if (contact && contact.email) {
    return {
      lead_id: leadId,
      company: contact.organization_name ?? company,
      domain: resolvedDomain,
      contact_name: contact.name,
      contact_title: contact.title,
      contact_email: contact.email,
      contact_linkedin: contact.linkedin_url,
      company_size: contact.organization?.estimated_num_employees,
      company_industry: contact.organization?.industry,
      company_location: [contact.organization?.city, contact.organization?.country]
        .filter(Boolean)
        .join(", "),
      enrichment_source: "apollo",
      confidence: "high",
    };
  }

  // Apollo found contact but no verified email — preserve the real contact, but do not invent an email.
  if (contact) {
    return {
      lead_id: leadId,
      company: contact.organization_name ?? company,
      domain: resolvedDomain,
      contact_name: contact.name,
      contact_title: contact.title,
      contact_email: null,
      contact_linkedin: contact.linkedin_url,
      enrichment_source: "apollo",
      confidence: "medium",
    };
  }

  // No real match found.
  return {
    lead_id: leadId,
    company,
    domain: resolvedDomain,
    contact_name: "",
    contact_title: "",
    contact_email: null,
    contact_linkedin: null,
    enrichment_source: "apollo",
    confidence: "low",
  };
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leads,           // Array of {id, company, domain?} to enrich
      company,         // Single company enrichment
      domain,          // Optional domain hint
      lead_id,         // Optional lead ID to update in DB
      update_db = true,
    } = body;

    if (!process.env.APOLLO_API_KEY) {
      return NextResponse.json(
        { error: "Enrichment Bee requires APOLLO_API_KEY for real contact data." },
        { status: 503 }
      );
    }

    const db = getSupabaseServer();

    // ── Batch enrichment ──
    if (Array.isArray(leads) && leads.length > 0) {
      const results: EnrichmentResult[] = [];
      let enriched = 0;

      for (const lead of leads) {
        const result = await enrichLead(lead.company, lead.domain, lead.id);
        results.push(result);

        // Update analyst_leads table
        if (update_db && lead.id) {
          await db
            .from("analyst_leads")
            .update({
              contact_name: result.contact_name,
              contact_email: result.contact_email,
              contact_linkedin: result.contact_linkedin,
              company: result.company,
              status: result.contact_email ? "enriched" : "new",
            })
            .eq("id", lead.id);
        }

        if (result.contact_email) enriched++;

        // Rate limit: Apollo allows ~200 req/min on free tier
        await new Promise((r) => setTimeout(r, 300));
      }

      // Log to hive
      await db.from("hive_log").insert({
        bee: "enrich",
        action: `Enriched ${enriched}/${leads.length} leads via Apollo`,
        details: { total: leads.length, enriched, sources: results.map((r) => r.enrichment_source) },
        status: enriched > 0 ? "success" : "failed",
      });

      // Telegram update
      await sendHiveUpdate(
        `🔬 *Enrichment Bee Report*\n\n✅ Enriched: ${enriched}/${leads.length} leads\n📧 Verified emails found: ${results.filter((r) => r.contact_email && r.enrichment_source === "apollo").length}\n🚫 Guessed emails: 0\n\nReady for Closer v2 →`
      );

      return NextResponse.json({ enriched, total: leads.length, results });
    }

    // ── Single enrichment ──
    if (company) {
      const result = await enrichLead(company, domain, lead_id);

      if (update_db && lead_id) {
        await db
          .from("analyst_leads")
          .update({
            contact_name: result.contact_name,
            contact_email: result.contact_email,
            contact_linkedin: result.contact_linkedin,
            company: result.company,
            status: result.contact_email ? "enriched" : "new",
          })
          .eq("id", lead_id);
      }

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Provide 'company' or 'leads' array" }, { status: 400 });
  } catch (error) {
    console.error("[Enrich API]", error);
    return NextResponse.json(
      { error: "Enrichment Bee error", details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get("company");
  const domain = searchParams.get("domain") ?? undefined;

  if (!company) {
    return NextResponse.json({ error: "company query param required" }, { status: 400 });
  }

  const result = await enrichLead(company, domain);
  return NextResponse.json(result);
}
