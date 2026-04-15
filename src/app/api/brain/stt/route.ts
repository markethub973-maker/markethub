/**
 * POST /api/brain/stt — Whisper transcribe (voice → text).
 * Body: multipart/form-data with `audio` file (webm/ogg/mp3).
 * Auth: brain_admin cookie.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (req.cookies.get("brain_admin")?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });

  const incoming = await req.formData();
  const file = incoming.get("audio");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "audio file required" }, { status: 400 });
  }
  const fd = new FormData();
  fd.append("file", file, "voice.webm");
  fd.append("model", "whisper-1");
  fd.append("language", "ro");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  });
  if (!res.ok) return NextResponse.json({ error: `whisper ${res.status}` }, { status: 502 });
  const d = (await res.json()) as { text?: string };
  return NextResponse.json({ ok: true, text: d.text ?? "" });
}
