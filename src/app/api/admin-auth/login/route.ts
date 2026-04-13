import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { generateAdminToken } from "@/lib/adminAuth";
import { logAudit, getIpFromHeaders } from "@/lib/auditLog";
import { getStatus as get2FAStatus, verifyCode as verify2FACode } from "@/lib/admin2fa";

export async function POST(request: NextRequest) {
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
      // Log failed attempt for audit trail (OWASP A09)
      await logAudit({
        action: "admin_login",
        actor_id: "unknown",
        details: { success: false },
        ip: getIpFromHeaders(request.headers),
      }).catch(() => {});
      return NextResponse.json(
        { error: "Invalid password" },
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
