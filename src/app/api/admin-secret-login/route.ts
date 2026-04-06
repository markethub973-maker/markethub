import { NextResponse } from "next/server";
import crypto from "crypto";
import { generateAdminToken } from "@/lib/adminAuth";

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

    // Constant-time comparison — pad to equal length to avoid length-based timing leak
    const a = Buffer.from(password);
    const b = Buffer.from(adminPassword);
    const maxLen = Math.max(a.length, b.length);
    const aPad = Buffer.concat([a, Buffer.alloc(maxLen - a.length)]);
    const bPad = Buffer.concat([b, Buffer.alloc(maxLen - b.length)]);
    const passwordMatch = a.length === b.length && crypto.timingSafeEqual(aPad, bPad);
    if (!passwordMatch) {
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
