import { NextRequest, NextResponse } from "next/server";
import { verifyCode } from "@/lib/admin2fa";

export const dynamic = "force-dynamic";

// POST { code } — verify a TOTP / recovery code.
// Used by the admin login flow as a second-factor step BEFORE setting
// the admin session cookie. Public on purpose: caller is mid-login.
// Wrapped by /api/admin-auth which gates first-factor (password).
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  if (!body?.code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }
  const r = await verifyCode(body.code);
  if (!r.ok) {
    return NextResponse.json({ error: r.error ?? "Invalid code" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, was_recovery: r.was_recovery ?? false });
}
