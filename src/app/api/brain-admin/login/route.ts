/**
 * POST /api/brain-admin/login — password gate for brain.markethubpromo.com
 *
 * Body: { password: string }
 * On match, sets `brain_admin` httpOnly cookie on the brain.* host. Middleware
 * rewrites the root path of that subdomain to /brain-private when the cookie
 * is present.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const expected = process.env.BRAIN_ADMIN_PASSWORD;

  if (!expected) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (!body.password || body.password !== expected) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("brain_admin", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    domain: ".markethubpromo.com",
  });
  return res;
}
