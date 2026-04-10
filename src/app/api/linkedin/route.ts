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
    const res = await fetch(
      `https://linkedin-data-api.p.rapidapi.com/get-profile-data-by-url?url=https://www.linkedin.com/in/${encodeURIComponent(username)}/`,
      {
        headers: {
          "x-rapidapi-host": "linkedin-data-api.p.rapidapi.com",
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `LinkedIn API error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      profile: {
        name: `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
        headline: data.headline ?? "",
        summary: data.summary ?? "",
        followers: data.followersCount ?? 0,
        connections: data.connectionsCount ?? 0,
        location: data.geo?.full ?? "",
        avatar: data.profilePicture ?? "",
        url: `https://www.linkedin.com/in/${username}/`,
        company: data.position?.[0]?.companyName ?? "",
        position: data.position?.[0]?.title ?? "",
      },
      raw: data,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
