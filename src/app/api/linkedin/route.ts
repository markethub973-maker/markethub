import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

  if (!RAPIDAPI_KEY) return NextResponse.json({ error: "RapidAPI not configured" }, { status: 500 });

  try {
    // Try Fresh LinkedIn Scraper API (free tier available at rapidapi.com)
    const res = await fetch(
      `https://fresh-linkedin-scraper-api.p.rapidapi.com/api/v1/user/profile?username=${encodeURIComponent(username)}`,
      {
        headers: {
          "x-rapidapi-host": "fresh-linkedin-scraper-api.p.rapidapi.com",
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
      }
    );

    if (res.status === 403) {
      return NextResponse.json({
        error: "LinkedIn API necesită abonament gratuit pe RapidAPI. Mergi la: rapidapi.com/freshdata-freshdata-default/api/fresh-linkedin-profile-data → Subscribe (Free, 50 req/lună, fără card).",
        needs_subscription: true,
        subscribe_url: "https://rapidapi.com/freshdata-freshdata-default/api/fresh-linkedin-profile-data",
      }, { status: 402 });
    }

    if (!res.ok) {
      return NextResponse.json({ error: `LinkedIn API error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const p = data.data ?? data;
    return NextResponse.json({
      profile: {
        name: `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.fullName || p.name || "",
        headline: p.headline ?? p.title ?? "",
        summary: p.summary ?? p.about ?? "",
        followers: p.followersCount ?? p.followers ?? 0,
        connections: p.connectionsCount ?? p.connections ?? 0,
        location: p.location ?? p.geo?.full ?? "",
        avatar: p.profilePicture ?? p.photo ?? "",
        url: `https://www.linkedin.com/in/${username}/`,
        company: p.position?.[0]?.companyName ?? p.currentCompany ?? "",
        position: p.position?.[0]?.title ?? p.currentPosition ?? "",
      },
      raw: data,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
