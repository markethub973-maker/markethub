import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Redis } from "@upstash/redis";
import { generateAdminToken } from "@/lib/adminAuth";
import { logAudit, getIpFromHeaders } from "@/lib/auditLog";
import { getStatus as get2FAStatus, verifyCode as verify2FACode } from "@/lib/admin2fa";

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 900; // 15 min lockout after 3 failed attempts

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return { allowed: true, remaining: MAX_ATTEMPTS };
    const redis = new Redis({ url, token });
    const key = `admin_login:${ip}`;
    const attempts = (await redis.get<number>(key)) ?? 0;
    if (attempts >= MAX_ATTEMPTS) return { allowed: false, remaining: 0 };
    return { allowed: true, remaining: MAX_ATTEMPTS - attempts };
  } catch {
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }
}

async function recordFailedAttempt(ip: string): Promise<void> {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return;
    const redis = new Redis({ url, token });
    const key = `admin_login:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, LOCKOUT_SECONDS);
  } catch { /* best effort */ }
}

async function clearAttempts(ip: string): Promise<void> {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return;
    const redis = new Redis({ url, token });
    await redis.del(`admin_login:${ip}`);
  } catch { /* best effort */ }
}

// Notify Eduard via Telegram when brute force detected
async function alertBruteForce(ip: string): Promise<void> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
    if (!token || !chatId) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🚨 ADMIN BRUTE FORCE ALERT\n\nIP: ${ip}\n${MAX_ATTEMPTS}+ failed login attempts in ${LOCKOUT_SECONDS / 60} min.\nIP locked out for ${LOCKOUT_SECONDS / 60} minutes.\n\nCheck /dashboard/admin → Security Events`,
      }),
    });
  } catch { /* best effort */ }
}

export async function POST(request: NextRequest) {
  // Rate limit check — 3 attempts per 15 min per IP
  const ip = getIpFromHeaders(request.headers) ?? "unknown";
  const { allowed, remaining } = await checkRateLimit(ip);
  if (!allowed) {
    await logAudit({
      action: "admin_login",
      actor_id: "blocked",
      details: { success: false, reason: "rate_limited", ip },
      ip,
    }).catch(() => {});
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429, headers: { "Retry-After": String(LOCKOUT_SECONDS) } },
    );
  }
  try {
    const { password, totp_code } = (await request.json()) as {
      password?: string;
      totp_code?: string;
    };

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json({ error: "Admin not configured" }, { status: 500 });
    }

    // Constant-time comparison — bitwise AND prevents short-circuit timing leak on length
    const a = Buffer.from(password);
    const b = Buffer.from(adminPassword);
    const maxLen = Math.max(a.length, b.length);
    const aPad = Buffer.concat([a, Buffer.alloc(maxLen - a.length)]);
    const bPad = Buffer.concat([b, Buffer.alloc(maxLen - b.length)]);
    const lenEqual = a.length === b.length ? 1 : 0;
    const contentEqual = crypto.timingSafeEqual(aPad, bPad) ? 1 : 0;
    const passwordMatch = (lenEqual & contentEqual) === 1;

    if (!passwordMatch) {
      await recordFailedAttempt(ip);
      const afterFail = await checkRateLimit(ip);
      if (afterFail.remaining === 0) {
        await alertBruteForce(ip);
      }
      await logAudit({
        action: "admin_login",
        actor_id: "unknown",
        details: { success: false, attempts_remaining: afterFail.remaining },
        ip,
      }).catch(() => {});
      return NextResponse.json(
        { error: `Invalid password. ${afterFail.remaining} attempt${afterFail.remaining !== 1 ? "s" : ""} remaining.` },
        { status: 401 }
      );
    }

    // Second factor: if 2FA is enrolled, require valid TOTP/recovery code.
    // Returns 401 with "needs_2fa: true" so client can prompt for code
    // and re-submit with totp_code included.
    const twofa = await get2FAStatus();
    if (twofa.enrolled) {
      if (!totp_code) {
        return NextResponse.json(
          { error: "2FA code required", needs_2fa: true },
          { status: 401 }
        );
      }
      const v = await verify2FACode(totp_code);
      if (!v.ok) {
        await logAudit({
          action: "admin_login",
          actor_id: "unknown",
          details: { success: false, reason: "2fa_failed", err: v.error },
          ip: getIpFromHeaders(request.headers),
        }).catch(() => {});
        return NextResponse.json(
          { error: v.error ?? "Invalid 2FA code", needs_2fa: true },
          { status: 401 }
        );
      }
      // 2FA passed — log and continue to set session
    }

    // Login success — clear rate limit counter
    await clearAttempts(ip);
    const sessionToken = generateAdminToken();

    const response = NextResponse.json({
      success: true,
      message: "Admin access granted",
      twofa_used: twofa.enrolled,
    });

    await logAudit({
      action: "admin_login",
      actor_id: "admin",
      details: { success: true },
      ip: getIpFromHeaders(request.headers),
      user_agent: request.headers.get("user-agent") ?? undefined,
    }).catch(() => {});

    response.cookies.set({
      name: "admin_session_token",
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
