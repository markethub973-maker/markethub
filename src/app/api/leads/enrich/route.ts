import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requirePlan } from "@/lib/requirePlan";
import { safeApify } from "@/lib/serviceGuard";
import { fetchAndExtract } from "@/lib/leadScraper";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

// Enrich leads with platform-specific scrapers:
// - instagram/youtube → Apify actors (profile bio + business email/phone)
// - website           → HTML scraper from lib/leadScraper (tel: hrefs + email regex)
// Writes results back to the lead row, only filling empty fields so user
// edits are preserved. Capped to 10 leads per call so a single click can't
// drain the user's Apify quota.

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function findEmailIn(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(EMAIL_RE);
  return m?.[0]?.toLowerCase() || null;
}

function findPhoneIn(text: string | null | undefined, country?: CountryCode): string | null {
  if (!text) return null;
  // Loose pre-scan, then libphonenumber validation. Bio text often has
  // numbers wrapped in emoji/symbols so we strip those before parsing.
  const candidates = text.match(/[\+\d][\d\s\-().]{7,20}/g) || [];
  for (const c of candidates) {
    const parsed = parsePhoneNumberFromString(c.trim(), country);
    if (parsed?.isValid()) return parsed.number;
  }
  return null;
}

async function enrichInstagram(url: string): Promise<{ email?: string; phone?: string; bio?: string; followers?: number; externalUrl?: string } | null> {
  // resultsType="details" returns the profile object with biography,
  // businessEmail, businessPhoneNumber, externalUrl — exactly what we need.
  const r = await safeApify<any[]>("apify~instagram-scraper", {
    directUrls: [url],
    resultsType: "details",
    resultsLimit: 1,
  }, { timeoutSec: 60, retries: 0 });
  if (!r.ok || !r.data?.length) return null;
  const p = r.data[0];
  return {
    email: p.businessEmail || findEmailIn(p.biography) || undefined,
    phone: p.businessPhoneNumber || findPhoneIn(p.biography) || undefined,
    bio: p.biography || undefined,
    followers: p.followersCount || undefined,
    externalUrl: p.externalUrl || undefined,
  };
}

async function enrichWebsite(url: string): Promise<{ email?: string; phone?: string; bio?: string; name?: string; address?: string } | null> {
  // Reuses the same fetch+parse pipeline as the bulk Google save flow.
  // libphonenumber validates phones against TLD-derived country context, so
  // .ro sites get RO context, .de sites get DE context, etc.
  // Address comes from JSON-LD PostalAddress, <address> tag, or RO/EN street regex.
  const r = await fetchAndExtract(url);
  if (!r.ok) return null;
  return {
    email: r.emails[0] || undefined,
    phone: r.phones[0] || undefined,
    bio: r.description || undefined,
    name: r.name || undefined,
    address: r.address || undefined,
  };
}

async function enrichYouTube(url: string): Promise<{ email?: string; phone?: string; bio?: string; followers?: number } | null> {
  // streamers/youtube-scraper accepts channel URLs and returns video items
  // with channelDescription on the first item. Channel "About" descriptions
  // very commonly contain a contact email.
  const r = await safeApify<any[]>("streamers~youtube-scraper", {
    startUrls: [{ url }],
    maxResults: 1,
  }, { timeoutSec: 90, retries: 0 });
  if (!r.ok || !r.data?.length) return null;
  const v = r.data[0];
  const bio = v.channelDescription || v.text || null;
  return {
    email: findEmailIn(bio) || undefined,
    phone: findPhoneIn(bio) || undefined,
    bio: bio?.slice(0, 500) || undefined,
    followers: v.numberOfSubscribers || undefined,
  };
}

export async function POST(req: NextRequest) {
  const check = await requirePlan(req, "/leads");
  if (check instanceof NextResponse) return check;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await req.json();
  if (!Array.isArray(ids) || !ids.length) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }
  const capped = ids.slice(0, 10);

  const supa = createServiceClient();
  const { data: leads, error } = await supa
    .from("research_leads")
    .select("id, lead_type, url, website, email, phone, name, address, extra_data")
    .in("id", capped)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "fetch failed" }, { status: 500 });

  const results: { id: string; status: "enriched" | "skipped" | "error"; reason?: string; email?: string; phone?: string }[] = [];

  for (const lead of leads || []) {
    const target = lead.url || lead.website;
    if (!target) { results.push({ id: lead.id, status: "skipped", reason: "no url" }); continue; }

    let enriched: Awaited<ReturnType<typeof enrichInstagram>> = null;
    try {
      if (lead.lead_type === "instagram") enriched = await enrichInstagram(target);
      else if (lead.lead_type === "youtube") enriched = await enrichYouTube(target);
      else if (lead.lead_type === "website") enriched = await enrichWebsite(target);
      else { results.push({ id: lead.id, status: "skipped", reason: `unsupported: ${lead.lead_type}` }); continue; }
    } catch (e: any) {
      results.push({ id: lead.id, status: "error", reason: e?.message || "exception" });
      continue;
    }

    if (!enriched) {
      results.push({ id: lead.id, status: "error", reason: "actor returned no data" });
      continue;
    }

    // Build patch — only overwrite empty fields, preserve existing user edits.
    const patch: Record<string, any> = {};
    if (!lead.email && enriched.email) patch.email = enriched.email;
    if (!lead.phone && enriched.phone) patch.phone = enriched.phone;
    if (!lead.name && "name" in enriched && enriched.name) patch.name = enriched.name;
    if (!lead.address && "address" in enriched && enriched.address) patch.address = enriched.address;

    const newExtra = { ...(lead.extra_data || {}) };
    if (enriched.bio) newExtra.bio = enriched.bio;
    if ("followers" in enriched && enriched.followers && !newExtra.followers) newExtra.followers = enriched.followers;
    if ("externalUrl" in enriched && enriched.externalUrl) newExtra.externalUrl = enriched.externalUrl;
    newExtra.enrichedAt = new Date().toISOString();
    patch.extra_data = newExtra;

    const { error: ue } = await supa.from("research_leads").update(patch).eq("id", lead.id).eq("user_id", user.id);
    if (ue) {
      results.push({ id: lead.id, status: "error", reason: ue.message });
      continue;
    }
    results.push({ id: lead.id, status: "enriched", email: patch.email, phone: patch.phone });
  }

  const enrichedCount = results.filter(r => r.status === "enriched").length;
  const skippedCount = results.filter(r => r.status === "skipped").length;
  const errorCount = results.filter(r => r.status === "error").length;

  return NextResponse.json({
    success: true,
    enriched: enrichedCount,
    skipped: skippedCount,
    errors: errorCount,
    results,
  });
}
