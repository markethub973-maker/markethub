import { NextResponse } from "next/server";
import crypto from "crypto";
import { generateAdminToken } from "@/lib/adminAuth";
import { logAudit, getIpFromHeaders } from "@/lib/auditLog";
import { logSecurityEvent } from "@/lib/siem";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

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

    // Constant-time comparison — pad to equal length to avoid length-based timing leak.
    // IMPORTANT: both length check and timingSafeEqual must always execute (no short-circuit)
    // so that timing does not reveal password length.
    const a = Buffer.from(password);
    const b = Buffer.from(adminPassword);
    const maxLen = Math.max(a.length, b.length);
    const aPad = Buffer.concat([a, Buffer.alloc(maxLen - a.length)]);
    const bPad = Buffer.concat([b, Buffer.alloc(maxLen - b.length)]);
    const lenEqual = a.length === b.length ? 1 : 0;
    const contentEqual = crypto.timingSafeEqual(aPad, bPad) ? 1 : 0;
    // Bitwise AND — both operands ALWAYS evaluated, no short-circuit timing leak
    const passwordMatch = (lenEqual & contentEqual) === 1;
    if (!passwordMatch) {
      const ipHdr = getIpFromHeaders(request instanceof Request ? request.headers : new Headers());
      await logAudit({
        action: "admin_login",
        actor_id: "unknown",
        details: { success: false },
        ip: ipHdr,
      });
      void logSecurityEvent({
        event_type: "admin_login_failed",
        ip: ipHdr,
        path: "/api/admin-secret-login",
        user_agent: request.headers.get("user-agent") ?? undefined,
        details: { reason: "bad_password" },
      });
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Deterministic HMAC token — verifiable without storing
    const sessionToken = generateAdminToken();

    const response = NextResponse.json({
      success: true,
      message: "Admin access granted",
    });

    const ipHdr = getIpFromHeaders(request instanceof Request ? request.headers : new Headers());
    await logAudit({
      action: "admin_login",
      actor_id: "admin",
      details: { success: true },
      ip: ipHdr,
      user_agent: request.headers.get("user-agent") ?? undefined,
    });
    void logSecurityEvent({
      event_type: "admin_login",
      ip: ipHdr,
      path: "/api/admin-secret-login",
      user_agent: request.headers.get("user-agent") ?? undefined,
    });

    // Set secure session cookie
    response.cookies.set({
      name: "admin_session_token",
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60, // 8 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Admin secret login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
