import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("admin_session_token");

    if (!sessionToken || !sessionToken.value) {
      return NextResponse.json(
        { error: "No admin session found" },
        { status: 401 }
      );
    }

    // Token exists and is valid
    return NextResponse.json({
      success: true,
      message: "Valid admin session",
    });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
