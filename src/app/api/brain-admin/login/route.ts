/**
 * POST /api/brain-admin/login — password gate for brain.markethubpromo.com
 *
 * Body: { password: string }
 * On match, sets `brain_admin` httpOnly cookie on the brain.* host. Middleware
 * rewrites the root path of that subdomain to /brain-private when the cookie
 * is present.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Per-IP rate limiter (in-memory — fine for a single Vercel region,
// good-enough protection from casual brute force). Upstash would be
// better across regions but this endpoint sees almost no traffic.
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function tooManyAttempts(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (tooManyAttempts(ip)) {
    return NextResponse.json(
      { error: "Too many attempts — wait 15 minutes." },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const expected = process.env.BRAIN_ADMIN_PASSWORD;

  if (!expected) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (!body.password || !constantTimeEq(body.password, expected)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  // Reset attempts on success
  attempts.delete(ip);

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
