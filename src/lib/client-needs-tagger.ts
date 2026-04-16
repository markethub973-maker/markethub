/**
 * Auto-tag client needs from website snippets / enriched lead data.
 *
 * Writes to brain_client_needs so the cross-sell graph populates. When a
 * prospect has multiple overlapping needs with another prospect → signal
 * for bundle pricing or referral loops.
 *
 * Uses fast regex detection (no extra LLM call) — good enough for bulk
 * scanning. Reserve LLM enrichment for warm leads later.
 */

import { createServiceClient } from "@/lib/supabase/service";

// Regex patterns mapping keywords → canonical need tags.
// Each tag is a discrete "need" MarketHub Pro could potentially help with.
const NEED_PATTERNS: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: "content", patterns: [/content|blog|articles|caption|post|social media/i] },
  { tag: "leads", patterns: [/lead|prospect|b2b|sales pipeline|cold outreach/i] },
  { tag: "ads", patterns: [/ads|campaign|facebook ads|google ads|meta|adwords|ppc/i] },
  { tag: "seo", patterns: [/seo|search engine|google ranking|organic traffic/i] },
  { tag: "local-seo", patterns: [/google my business|gmb|local search|near me/i] },
  { tag: "reviews", patterns: [/review|testimonial|rating|reputation/i] },
  { tag: "email-marketing", patterns: [/newsletter|email campaign|drip|automation/i] },
  { tag: "web-design", patterns: [/website design|landing page|webdesign|ui\/ux/i] },
  { tag: "ecommerce", patterns: [/shop|magazin online|cart|checkout|shopify|woocommerce/i] },
  { tag: "video", patterns: [/video|reels|tiktok|youtube|videoclip/i] },
  { tag: "branding", patterns: [/brand|identit|logo|branding|brand voice/i] },
  { tag: "analytics", patterns: [/analyti|report|dashboard|tracking|kpi|metric/i] },
  { tag: "appointment-booking", patterns: [/booking|programare|appointment|reservation|schedule/i] },
  { tag: "crm", patterns: [/crm|customer relations|pipeline|hubspot|salesforce/i] },
  { tag: "agency-services", patterns: [/agency|agentie|agenție|full-service/i] },
  { tag: "coaching", patterns: [/coach|training|mentor|workshop|curs|course/i] },
  { tag: "dental", patterns: [/dental|stomatolog|dinte|pacient|cabinet/i] },
  { tag: "medical", patterns: [/medic|clinic|health|pacient|wellness/i] },
  { tag: "legal", patterns: [/avocat|lawyer|legal|juridic/i] },
  { tag: "real-estate", patterns: [/imobiliar|real estate|proprieta|apartament/i] },
];

export function detectNeeds(snippet: string | null | undefined): string[] {
  if (!snippet) return [];
  const tags = new Set<string>();
  for (const { tag, patterns } of NEED_PATTERNS) {
    if (patterns.some((re) => re.test(snippet))) {
      tags.add(tag);
    }
  }
  return Array.from(tags);
}

export interface TagClientInput {
  domain: string;
  business_name?: string | null;
  vertical?: string | null;
  intermediary_type?: string | null;
  end_client_segment?: string | null;
  snippet?: string | null;
  match_score?: number | null;
  extra_needs?: string[]; // caller-provided tags (e.g., from Claude analysis)
}

/**
 * Upsert a client into brain_client_needs with detected needs array.
 * Idempotent per domain.
 */
export async function tagClientNeeds(input: TagClientInput): Promise<void> {
  try {
    const svc = createServiceClient();
    const detected = detectNeeds(input.snippet);
    const allNeeds = Array.from(new Set([...detected, ...(input.extra_needs ?? [])]));
    if (allNeeds.length === 0 && !input.intermediary_type) return; // nothing to tag

    // Check if this domain already has a row
    const { data: existing } = await svc
      .from("brain_client_needs")
      .select("id, needs")
      .eq("domain", input.domain)
      .maybeSingle();
    if (existing) {
      // Merge needs
      const merged = Array.from(new Set([...(existing.needs ?? []), ...allNeeds]));
      await svc
        .from("brain_client_needs")
        .update({
          needs: merged,
          business_name: input.business_name ?? undefined,
          vertical: input.vertical ?? undefined,
          intermediary_type: input.intermediary_type ?? undefined,
          end_client_segment: input.end_client_segment ?? undefined,
          match_score: input.match_score ?? undefined,
        })
        .eq("id", existing.id);
    } else {
      await svc.from("brain_client_needs").insert({
        domain: input.domain,
        business_name: input.business_name,
        vertical: input.vertical,
        intermediary_type: input.intermediary_type,
        end_client_segment: input.end_client_segment,
        needs: allNeeds,
        match_score: input.match_score,
      });
    }
  } catch {
    /* non-fatal */
  }
}

/**
 * Find domains that share ≥ minOverlap needs with the given domain.
 * Used to surface cross-sell / bundle opportunities.
 */
export async function findOverlappingClients(
  domain: string,
  minOverlap = 2,
): Promise<Array<{ domain: string; shared_needs: string[] }>> {
  try {
    const svc = createServiceClient();
    const { data: base } = await svc
      .from("brain_client_needs")
      .select("needs")
      .eq("domain", domain)
      .maybeSingle();
    if (!base?.needs?.length) return [];
    const baseNeeds = base.needs as string[];
    const { data: others } = await svc
      .from("brain_client_needs")
      .select("domain, needs")
      .neq("domain", domain)
      .limit(100);
    const overlaps = (others ?? [])
      .map((o) => {
        const shared = (o.needs as string[]).filter((n) => baseNeeds.includes(n));
        return { domain: o.domain as string, shared_needs: shared };
      })
      .filter((o) => o.shared_needs.length >= minOverlap)
      .sort((a, b) => b.shared_needs.length - a.shared_needs.length);
    return overlaps;
  } catch {
    return [];
  }
}
