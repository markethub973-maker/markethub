import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

const DRIVE_API = "https://www.googleapis.com/drive/v3";

async function refreshDriveToken(userId: string, refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const { access_token, expires_in } = await res.json();
  const supa = createServiceClient();
  await supa.from("profiles").update({
    gdrive_access_token: access_token,
    gdrive_token_expires_at: new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString(),
  }).eq("id", userId);
  return access_token;
}

// GET /api/assets/drive?folder_id=XXX — list files from Drive folder
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const folderId = req.nextUrl.searchParams.get("folder_id");

  const supa = createServiceClient();
  const { data: profile } = await supa
    .from("profiles")
    .select("gdrive_access_token, gdrive_refresh_token, gdrive_token_expires_at, gdrive_folder_id")
    .eq("id", auth.userId)
    .single();

  if (!profile?.gdrive_access_token) {
    return NextResponse.json({ error: "Google Drive not connected", needs_auth: true }, { status: 401 });
  }

  // Refresh token if expired
  let token = profile.gdrive_access_token;
  if (profile.gdrive_token_expires_at && new Date(profile.gdrive_token_expires_at) < new Date()) {
    if (!profile.gdrive_refresh_token) return NextResponse.json({ error: "Token expired, reconnect Drive", needs_auth: true }, { status: 401 });
    token = await refreshDriveToken(auth.userId, profile.gdrive_refresh_token) ?? token;
  }

  const targetFolder = folderId || profile.gdrive_folder_id;
  if (!targetFolder) return NextResponse.json({ error: "No folder specified" }, { status: 400 });

  // Save folder_id preference
  if (folderId && folderId !== profile.gdrive_folder_id) {
    await supa.from("profiles").update({ gdrive_folder_id: folderId }).eq("id", auth.userId);
  }

  const q = encodeURIComponent(`'${targetFolder}' in parents and trashed=false`);
  const fields = encodeURIComponent("files(id,name,mimeType,size,webViewLink,thumbnailLink,createdTime,modifiedTime)");
  const driveRes = await fetch(
    `${DRIVE_API}/files?q=${q}&fields=${fields}&pageSize=100&orderBy=modifiedTime+desc`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!driveRes.ok) {
    const err = await driveRes.json();
    return NextResponse.json({ error: err.error?.message ?? "Drive API error" }, { status: 500 });
  }

  const { files } = await driveRes.json();
  return NextResponse.json({ files: files ?? [], folder_id: targetFolder });
}

// POST /api/assets/drive — import selected Drive files as Assets
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { files, category = "production" } = await req.json();
  if (!Array.isArray(files) || files.length === 0) return NextResponse.json({ error: "No files provided" }, { status: 400 });

  const supa = createServiceClient();
  const rows = files.map((f: any) => ({
    user_id: auth.userId,
    name: f.name,
    category,
    external_url: f.webViewLink,
    file_size: parseInt(f.size ?? "0"),
    mime_type: f.mimeType,
    notes: `Imported from Google Drive on ${new Date().toLocaleDateString("en-GB")}`,
    tags: ["google-drive"],
  }));

  const { data, error } = await supa.from("assets").insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imported: data?.length ?? 0, assets: data });
}
