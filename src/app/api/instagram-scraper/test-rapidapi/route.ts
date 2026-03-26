import { NextResponse } from "next/server";

/**
 * Diagnostic endpoint to test RapidAPI connection
 * GET /api/instagram-scraper/test-rapidapi
 */
export async function GET() {
  const apiKey = process.env.RAPIDAPI_KEY;
  const RAPIDAPI_HOST = "instagram-public-bulk-scraper.p.rapidapi.com";

  console.log("[RapidAPI Test] Starting diagnostic...");
  console.log("[RapidAPI Test] API Key exists:", !!apiKey);
  console.log("[RapidAPI Test] API Key length:", apiKey?.length);
  console.log("[RapidAPI Test] API Host:", RAPIDAPI_HOST);

  if (!apiKey) {
    return NextResponse.json({
      status: "error",
      message: "RAPIDAPI_KEY environment variable is not set",
      apiKeyExists: false,
    }, { status: 500 });
  }

  try {
    // Test with a well-known public Instagram account
    const testUsername = "instagram";

    console.log(`[RapidAPI Test] Testing with username: ${testUsername}`);

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

    console.log(`[RapidAPI Test] Response Status: ${res.status}`);
    console.log(`[RapidAPI Test] Response Headers:`, Object.fromEntries(res.headers));

    const responseText = await res.text();
    console.log(`[RapidAPI Test] Response Body (first 500 chars):`, responseText.substring(0, 500));

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!res.ok) {
      return NextResponse.json({
        status: "error",
        statusCode: res.status,
        statusText: res.statusText,
        message: "RapidAPI returned an error",
        apiKey: {
          exists: true,
          length: apiKey.length,
          firstChars: apiKey.substring(0, 10) + "...",
          lastChars: "..." + apiKey.substring(apiKey.length - 10),
        },
        response: responseData,
      }, { status: 400 });
    }

    return NextResponse.json({
      status: "success",
      message: "RapidAPI connection successful",
      statusCode: res.status,
      apiKey: {
        exists: true,
        length: apiKey.length,
        firstChars: apiKey.substring(0, 10) + "...",
      },
      response: {
        hasData: !!responseData.data,
        dataKeys: responseData.data ? Object.keys(responseData.data).slice(0, 5) : [],
      },
    });

  } catch (err: any) {
    console.error("[RapidAPI Test] Exception:", err);
    return NextResponse.json({
      status: "error",
      message: "Exception during RapidAPI test",
      error: err.message,
      stack: err.stack,
    }, { status: 500 });
  }
}
