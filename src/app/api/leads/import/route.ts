import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

// POST /api/leads/import — bulk import from CSV parsed on client
// Body: { leads: [{ name, email, phone, website, city, category, notes }] }
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { leads } = await req.json();
  if (!Array.isArray(leads) || leads.length === 0) return NextResponse.json({ error: "No leads provided" }, { status: 400 });
  if (leads.length > 500) return NextResponse.json({ error: "Max 500 leads per import" }, { status: 400 });

  const supa = createServiceClient();

  // Dedup by website/email
  const { data: existing } = await supa.from("research_leads").select("website, email").eq("user_id", auth.userId);
  const existingWebsites = new Set((existing ?? []).map((r: any) => r.website?.toLowerCase()).filter(Boolean));
  const existingEmails = new Set((existing ?? []).map((r: any) => r.email?.toLowerCase()).filter(Boolean));

  const toInsert = leads
    .filter((l: any) => {
      if (l.website && existingWebsites.has(l.website.toLowerCase())) return false;
      if (l.email && existingEmails.has(l.email.toLowerCase())) return false;
      return true;
    })
    .map((l: any) => ({
      user_id: auth.userId,
      name: l.name?.trim() || l.company?.trim() || "Unknown",
      email: l.email?.trim() || null,
      phone: l.phone?.trim() || null,
      website: l.website?.trim() || null,
      city: l.city?.trim() || null,
      address: l.address?.trim() || null,
      category: l.category?.trim() || null,
      notes: l.notes?.trim() || null,
      source: "csv_import",
      lead_type: "search_result",
      pipeline_status: "new",
    }));

  if (toInsert.length === 0) {
    return NextResponse.json({ imported: 0, skipped: leads.length, message: "All leads already exist" });
  }

  const { data, error } = await supa.from("research_leads").insert(toInsert).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    imported: data?.length ?? 0,
    skipped: leads.length - toInsert.length,
    message: `${data?.length ?? 0} leads importate, ${leads.length - toInsert.length} duplicate ignorate`,
  });
}
