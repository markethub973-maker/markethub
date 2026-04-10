import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { createHash, randomBytes } from "crypto";

function generateKey(): { raw: string; prefix: string; hash: string } {
  const raw = "mhp_" + randomBytes(32).toString("hex");
  const prefix = raw.slice(0, 12);
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, prefix, hash };
}

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const supa = createServiceClient();
  const { data, error } = await supa.from("api_keys").select("id,name,key_prefix,last_used,expires_at,active,created_at").eq("user_id", auth.userId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ keys: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  // Check plan — only Business/Enterprise
  if (!["business", "enterprise", "admin"].includes(auth.userPlan)) {
    return NextResponse.json({ error: "API access requires Business plan or higher" }, { status: 403 });
  }

  const { name, expires_days } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { raw, prefix, hash } = generateKey();
  const expires_at = expires_days ? new Date(Date.now() + expires_days * 86400000).toISOString() : null;

  const supa = createServiceClient();
  const { data, error } = await supa.from("api_keys").insert({
    user_id: auth.userId, name, key_prefix: prefix, key_hash: hash, expires_at,
  }).select("id,name,key_prefix,expires_at,created_at").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Return raw key only once
  return NextResponse.json({ key: { ...data, raw_key: raw }, warning: "Save this key — it won't be shown again" }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await req.json();
  const supa = createServiceClient();
  await supa.from("api_keys").delete().eq("id", id).eq("user_id", auth.userId);
  return NextResponse.json({ ok: true });
}
