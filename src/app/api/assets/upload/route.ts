import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const category = (formData.get("category") as string) ?? "production";
  const client = (formData.get("client") as string) ?? "";
  const notes = (formData.get("notes") as string) ?? "";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const MAX_MB = 50;
  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `File exceeds ${MAX_MB}MB limit` }, { status: 413 });
  }

  const supa = createServiceClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const filePath = `${auth.userId}/${category}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supa.storage
    .from("assets")
    .upload(filePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Get signed URL valid 1 year
  const { data: signedData } = await supa.storage
    .from("assets")
    .createSignedUrl(filePath, 365 * 24 * 3600);

  const { data: asset, error: dbError } = await supa
    .from("assets")
    .insert({
      user_id: auth.userId,
      name: file.name,
      category,
      file_path: filePath,
      file_url: signedData?.signedUrl ?? null,
      file_size: file.size,
      mime_type: file.type || null,
      client,
      notes,
      tags: [],
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ asset }, { status: 201 });
}
