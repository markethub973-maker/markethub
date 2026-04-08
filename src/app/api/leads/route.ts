import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requirePlan } from "@/lib/requirePlan";

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
  const { data, error } = await supa
    .from("research_leads")
    .insert(rows)
    .select("id");

  if (error) {
    if (error.message.includes("relation") || error.message.includes("does not exist")) {
      return NextResponse.json({ error: "table_missing" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true, ids: data?.map(r => r.id) || [], count: rows.length });
}

export async function PATCH(req: NextRequest) {
  const check = await requirePlan(req, "/leads");
  if (check instanceof NextResponse) return check;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, contacted, notes } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const update: Record<string, any> = {};
  if (contacted !== undefined) update.contacted = contacted;
  if (notes !== undefined) update.notes = notes;

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
