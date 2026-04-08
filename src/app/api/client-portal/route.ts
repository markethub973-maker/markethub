import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hashPassword } from "@/lib/portal/password";

const FULL_FIELDS =
  "id, token, client_name, ig_username, tt_username, view_count, expires_at, created_at, updated_at, agency_name, agency_logo_url, accent_color, password_hash";
const LEGACY_FIELDS =
  "id, token, client_name, ig_username, tt_username, view_count, expires_at, created_at, updated_at";

// Detect if Supabase error means a column/schema cache is missing
// (i.e. migration for white-label/password columns has not been applied yet).
function isSchemaCacheError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  const msg = err.message ?? "";
  return (
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("Could not find the") ||
    msg.includes("column")
  );
}

// Strip password_hash from outgoing rows; expose only `has_password: boolean`.
function sanitize(row: any): any {
  if (!row) return row;
  const { password_hash, ...rest } = row;
  return { ...rest, has_password: !!password_hash };
}

function sanitizeMany(rows: any[] | null): any[] {
  if (!rows) return [];
  return rows.map(sanitize);
}

// POST — create a live portal link for a client
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    client_name,
    ig_username,
    tt_username,
    data,
    expires_days,
    agency_name,
    agency_logo_url,
    accent_color,
    password,
  } = body as {
    client_name: string;
    ig_username?: string;
    tt_username?: string;
    data?: Record<string, unknown>;
    expires_days?: number;
    agency_name?: string;
    agency_logo_url?: string;
    accent_color?: string;
    password?: string;
  };

  if (!client_name?.trim()) {
    return NextResponse.json({ error: "client_name is required" }, { status: 400 });
  }

  const expires_at = expires_days
    ? new Date(Date.now() + expires_days * 86400000).toISOString()
    : null;

  const baseRow: Record<string, unknown> = {
    user_id: user.id,
    client_name: client_name.trim(),
    ig_username: ig_username?.trim() || "",
    tt_username: tt_username?.trim() || "",
    data: data || {},
    expires_at,
  };

  const fullRow: Record<string, unknown> = {
    ...baseRow,
    agency_name: agency_name?.trim() || null,
    agency_logo_url: agency_logo_url?.trim() || null,
    accent_color: accent_color?.trim() || null,
  };

  if (password && password.trim()) {
    fullRow.password_hash = await hashPassword(password.trim());
  }

  const svc = createServiceClient();

  // Try with full schema (white-label + password) first; fall back to legacy
  // schema if any of those columns are missing on Supabase.
  const first = await svc
    .from("client_portal_links")
    .insert(fullRow)
    .select(FULL_FIELDS)
    .single();
  let link: any = first.data;
  let error = first.error;

  if (error && isSchemaCacheError(error)) {
    const retry = await svc
      .from("client_portal_links")
      .insert(baseRow)
      .select(LEGACY_FIELDS)
      .single();
    link = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ link: sanitize(link) });
}

// GET — list all portal links for the authenticated user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();

  const first = await svc
    .from("client_portal_links")
    .select(FULL_FIELDS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  let links: any = first.data;
  let error = first.error;

  if (error && isSchemaCacheError(error)) {
    const retry = await svc
      .from("client_portal_links")
      .select(LEGACY_FIELDS)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    links = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ links: sanitizeMany(links) });
}

// PATCH — update existing link: extend expiry, refresh data, set white-label, set/clear password
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    id,
    extend_days,
    data,
    agency_name,
    agency_logo_url,
    accent_color,
    password,
  } = body as {
    id?: string;
    extend_days?: number;
    data?: Record<string, unknown>;
    agency_name?: string | null;
    agency_logo_url?: string | null;
    accent_color?: string | null;
    password?: string | null;
  };

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const svc = createServiceClient();

  // Verify ownership before mutating
  const { data: existing, error: fetchErr } = await svc
    .from("client_portal_links")
    .select("id, user_id, expires_at")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }
  if ((existing as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const baseUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof extend_days === "number" && extend_days > 0) {
    const currentExpiry = (existing as { expires_at: string | null }).expires_at;
    const base = currentExpiry && new Date(currentExpiry) > new Date()
      ? new Date(currentExpiry)
      : new Date();
    baseUpdate.expires_at = new Date(base.getTime() + extend_days * 86400000).toISOString();
  }

  if (data && typeof data === "object") {
    baseUpdate.data = data;
  }

  // Full update layer (white-label + password) — fall back to baseUpdate on
  // schema-cache errors without losing the legitimate base updates.
  const fullUpdate: Record<string, unknown> = { ...baseUpdate };
  if (agency_name !== undefined) fullUpdate.agency_name = agency_name?.toString().trim() || null;
  if (agency_logo_url !== undefined) fullUpdate.agency_logo_url = agency_logo_url?.toString().trim() || null;
  if (accent_color !== undefined) fullUpdate.accent_color = accent_color?.toString().trim() || null;

  // password === null  → clear protection
  // password === ""    → clear protection
  // password === "abc" → set/replace
  // password undefined → leave unchanged
  if (password !== undefined) {
    if (password === null || password === "") {
      fullUpdate.password_hash = null;
    } else {
      fullUpdate.password_hash = await hashPassword(password);
    }
  }

  const first = await svc
    .from("client_portal_links")
    .update(fullUpdate)
    .eq("id", id)
    .select(FULL_FIELDS)
    .single();
  let link: any = first.data;
  let error = first.error;

  if (error && isSchemaCacheError(error)) {
    const retry = await svc
      .from("client_portal_links")
      .update(baseUpdate)
      .eq("id", id)
      .select(LEGACY_FIELDS)
      .single();
    link = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ link: sanitize(link) });
}

// DELETE — remove a portal link
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const svc = createServiceClient();
  const { error } = await svc
    .from("client_portal_links")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
