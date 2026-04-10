import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  try {

    return NextResponse.json({
      success: true,
      message: "Admin access confirmed",
      admin_id: "admin",
    });
  } catch (error) {
    console.error("Admin check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
