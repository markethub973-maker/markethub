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

    // Constant-time password comparison to prevent timing attacks
    const passwordMatch = crypto.timingSafeEqual(
      Buffer.from(password),
      Buffer.from(adminPassword)
    );
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

    response.cookies.set({
      name: "admin_session_token",
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
