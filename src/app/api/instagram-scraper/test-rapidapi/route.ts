import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";

/**
 * Diagnostic endpoint to test RapidAPI connection — ADMIN ONLY
 * GET /api/instagram-scraper/test-rapidapi
 */
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  const RAPIDAPI_HOST = "instagram-public-bulk-scraper.p.rapidapi.com";

  if (!apiKey) {
    return NextResponse.json({
      status: "error",
      message: "RAPIDAPI_KEY environment variable is not set",
      apiKeyExists: false,
    }, { status: 500 });
  }

  try {
    const testUsername = "instagram";

    const res = await fetch(
      `https://${RAPIDAPI_HOST}/v1/user_info_web?username=${testUsername}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": apiKey,
          "Accept": "application/json",
        },
      }
    );

    const responseText = await res.text();
    let responseData: any;
    try { responseData = JSON.parse(responseText); } catch { responseData = {}; }

    if (!res.ok) {
      return NextResponse.json({
        status: "error",
        statusCode: res.status,
        message: "RapidAPI returned an error",
        apiKeyConfigured: true, // never expose key chars
        response: { hasData: false },
      }, { status: 400 });
    }

    return NextResponse.json({
      status: "success",
      message: "RapidAPI connection successful",
      statusCode: res.status,
      apiKeyConfigured: true,
      response: {
        hasData: !!responseData.data,
        dataKeys: responseData.data ? Object.keys(responseData.data).slice(0, 5) : [],
      },
    });

  } catch (err: any) {
    return NextResponse.json({
      status: "error",
      message: "Exception during RapidAPI test",
      error: err.message,
    }, { status: 500 });
  }
}
