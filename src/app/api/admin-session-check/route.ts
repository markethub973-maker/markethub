import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateAdminToken } from "@/lib/adminAuth";
import crypto from "crypto";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("admin_session_token")?.value ?? "";

    if (!sessionToken) {
      return NextResponse.json({ error: "No admin session found" }, { status: 401 });
    }

    let expected: string;
    try {
      expected = generateAdminToken();
    } catch {
      // ADMIN_PASSWORD not configured — treat as unauthorized, not server error
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Constant-time comparison — prevents timing attacks
    // Both values must be valid hex of equal length
    let valid = false;
    try {
      if (sessionToken.length === expected.length && /^[0-9a-f]+$/.test(sessionToken)) {
        valid = crypto.timingSafeEqual(
          Buffer.from(sessionToken, "hex"),
          Buffer.from(expected, "hex")
        );
      }
    } catch {
      valid = false;
    }

    if (!valid) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    return NextResponse.json({ success: true, message: "Valid admin session" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
