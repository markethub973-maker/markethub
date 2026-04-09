import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requirePlan } from "@/lib/requirePlan";

// Normalize a URL so that the same destination written in different ways
// (https vs http, www vs m vs bare, trailing slash, query params, fragments)
// collapses to the same dedup key. Used to skip duplicate leads on insert.
function normalizeLeadUrl(u: string | null | undefined): string {
  if (!u) return "";
  try {
    // Case-insensitive scheme check — Google sometimes returns uppercase URLs
    const hasScheme = /^https?:\/\//i.test(u);
    const url = new URL(hasScheme ? u : "https://" + u);
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
    const path = url.pathname.replace(/\/+$/, "").toLowerCase();
    return host + path;
  } catch {
    return u.toLowerCase();
  }
}

export async function POST(req: NextRequest) {
  const check = await requirePlan(req, "/leads");
  if (check instanceof NextResponse) return check;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Single lead or batch
  const leads = Array.isArray(body) ? body : [body];
  const rows = leads.map((l: any) => ({
    user_id: user.id,
    agent_session_id: l.agent_session_id || null,
    goal: l.goal || null,
    source: l.source || l.platform || "lead_wizard",
    lead_type: l.lead_type || l.source_id || "search_result",
    name: l.name || l.title || l.contact_hint || null,
    category: l.category || null,
    address: l.address || null,
    city: l.city || null,
    phone: l.phone || null,
    website: l.url || l.website || null,
    email: l.email || null,
    rating: l.rating || null,
    reviews_count: l.reviews_count || null,
    url: l.url || null,
    extra_data: {
      description: l.description || null,
      score: l.score || null,
      label: l.label || null,
      signals: l.signals || [],
      why: l.why || null,
      platform: l.platform || null,
      // Merge any custom extra_data passed by the caller (e.g. plays/likes/followers
      // from Research Hub bulk save). Caller fields take precedence except over the
      // agent-session keys above which are still authoritative for agent flows.
      ...(l.extra_data && typeof l.extra_data === "object" ? l.extra_data : {}),
    },
  }));

  const supa = createServiceClient();

  // Cross-search dedup: pull every existing lead URL/website for this user, build
  // a set of normalized keys, then drop incoming rows whose URL is already there.
  // We also dedupe within the incoming batch itself (same URL twice in one POST).
  const { data: existing } = await supa
    .from("research_leads")
    .select("url, website")
    .eq("user_id", user.id);

  const seen = new Set<string>();
  for (const e of existing || []) {
    const k1 = normalizeLeadUrl(e.url);
    const k2 = normalizeLeadUrl(e.website);
    if (k1) seen.add(k1);
    if (k2) seen.add(k2);
  }

  const toInsert: typeof rows = [];
  const skipped: { url: string | null; reason: "duplicate" }[] = [];
  for (const row of rows) {
    const key = normalizeLeadUrl(row.url) || normalizeLeadUrl(row.website);
    if (key && seen.has(key)) {
      skipped.push({ url: row.url, reason: "duplicate" });
      continue;
    }
    if (key) seen.add(key); // also dedup within batch
    toInsert.push(row);
  }

  if (!toInsert.length) {
    return NextResponse.json({
      success: true,
      ids: [],
      count: 0,
      skipped: skipped.length,
      message: skipped.length ? `Toate ${skipped.length} lead-urile sunt deja în baza de date` : "Niciun lead de salvat",
    });
  }

  const { data, error } = await supa
    .from("research_leads")
    .insert(toInsert)
    .select("id");

  if (error) {
    if (error.message.includes("relation") || error.message.includes("does not exist")) {
      return NextResponse.json({ error: "table_missing" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    ids: data?.map(r => r.id) || [],
    count: toInsert.length,
    skipped: skipped.length,
  });
}

export async function PATCH(req: NextRequest) {
  const check = await requirePlan(req, "/leads");
  if (check instanceof NextResponse) return check;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, contacted, notes, pipeline_status } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Whitelist accepted pipeline stages so the API can't be used to scribble
  // arbitrary text into the column from the client.
  const VALID_STAGES = new Set(["new", "contacted", "replied", "interested", "client", "lost"]);

  const update: Record<string, any> = {};
  if (contacted !== undefined) update.contacted = contacted;
  if (notes !== undefined) update.notes = notes;
  if (pipeline_status !== undefined) {
    if (!VALID_STAGES.has(pipeline_status)) {
      return NextResponse.json({ error: "invalid pipeline_status" }, { status: 400 });
    }
    update.pipeline_status = pipeline_status;
  }

  const supa = createServiceClient();
  const { error } = await supa
    .from("research_leads")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const check = await requirePlan(req, "/leads");
  if (check instanceof NextResponse) return check;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supa = createServiceClient();
  const source = req.nextUrl.searchParams.get("source");
  const lead_type = req.nextUrl.searchParams.get("type");
  const session_id = req.nextUrl.searchParams.get("session");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

  let query = supa
    .from("research_leads")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (source) query = query.eq("source", source);
  if (lead_type) query = query.eq("lead_type", lead_type);
  if (session_id) query = query.eq("agent_session_id", session_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Internal server error" }, { status: 500 });

  return NextResponse.json({ leads: data || [], total: data?.length || 0 });
}

export async function DELETE(req: NextRequest) {
  const check = await requirePlan(req, "/leads");
  if (check instanceof NextResponse) return check;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await req.json();
  if (!Array.isArray(ids)) return NextResponse.json({ error: "ids array required" }, { status: 400 });

  const supa = createServiceClient();
  const { error } = await supa
    .from("research_leads")
    .delete()
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  return NextResponse.json({ success: true });
}
