/**
 * POST /api/upload — Upload file to Supabase storage (authenticated users)
 * Uses service client to bypass RLS.
 * Returns public URL.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) || "uploads";

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });

  const ext = file.name.split(".").pop() || "bin";
  const path = `${folder}/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const svc = createServiceClient();
  const bytes = await file.arrayBuffer();

  const { error } = await svc.storage
    .from("public-assets")
    .upload(path, new Uint8Array(bytes), { contentType: file.type, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = svc.storage.from("public-assets").getPublicUrl(path);
  return NextResponse.json({ ok: true, url: data.publicUrl });
}
