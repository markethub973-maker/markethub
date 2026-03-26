import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    // Get admin password from environment (hardcoded as fallback)
    const adminPassword = process.env.ADMIN_PASSWORD || "Market@!hub2026";

    // Check password
    if (password !== adminPassword) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Password correct - create secure session token
    const sessionToken = crypto.randomBytes(32).toString("hex");

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
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Admin secret login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
