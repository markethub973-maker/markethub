import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { verifyCode, disable } from "@/lib/admin2fa";

export const dynamic = "force-dynamic";

// POST — disable 2FA. Requires a current valid code so a stolen
// admin session alone can't turn protection off.
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  if (!body?.code) {
    return NextResponse.json({ error: "Current 2FA code required" }, { status: 400 });
  }
  const v = await verifyCode(body.code);
  if (!v.ok) {
    return NextResponse.json({ error: v.error ?? "Invalid code" }, { status: 400 });
  }
  const d = await disable();
  return NextResponse.json({ ok: d.ok });
}
