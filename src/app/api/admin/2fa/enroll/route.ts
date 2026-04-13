import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { generateEnrollment, confirmEnroll } from "@/lib/admin2fa";

export const dynamic = "force-dynamic";

// GET — start enrollment: returns secret + QR data URL.
// Caller is expected to scan, then POST with code + secret to confirm.
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const e = await generateEnrollment();
  return NextResponse.json({ ok: true, ...e });
}

// POST — confirm enrollment with first code from authenticator app.
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    secret_b32?: string;
    code?: string;
  } | null;
  if (!body?.secret_b32 || !body.code) {
    return NextResponse.json({ error: "secret_b32 + code required" }, { status: 400 });
  }
  const r = await confirmEnroll(body.secret_b32, body.code);
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    recovery_codes: r.recovery_codes,
    message: "2FA enabled. Save recovery codes — they will not be shown again.",
  });
}
