import { NextRequest, NextResponse } from "next/server";

async function getToken(): Promise<string> {
  const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    next: { revalidate: 3500 },
  });
  const d = await res.json();
  return d.access_token;
}

export async function GET(req: NextRequest) {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET)
    return NextResponse.json({ error: "Spotify not configured" }, { status: 500 });

  const country = req.nextUrl.searchParams.get("country") || "RO";

  try {
    const token = await getToken();
    const h = { Authorization: `Bearer ${token}` };

    // Get top chart playlists for this country (toplists category)
    const topRes = await fetch(
      `https://api.spotify.com/v1/browse/categories/toplists/playlists?country=${country}&limit=6`,
      { headers: h, next: { revalidate: 1800 } }
    );
    const topData = await topRes.json();
    const playlists = topData.playlists?.items || [];

    // Fetch tracks for first 3 playlists in parallel
    const trackRequests = playlists.slice(0, 3).map((p: any) =>
      fetch(
        `https://api.spotify.com/v1/playlists/${p.id}/tracks?limit=10&fields=items(track(id,name,artists,album(images,name),popularity,external_urls,preview_url,duration_ms))`,
        { headers: h, next: { revalidate: 1800 } }
      ).then(r => r.json())
    );
    const trackResults = await Promise.all(trackRequests);

    const result = playlists.slice(0, 3).map((p: any, i: number) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      thumbnail: p.images?.[0]?.url || "",
      permalink: p.external_urls?.spotify || "",
      followers: p.followers?.total || 0,
      tracks: (trackResults[i]?.items || [])
        .filter((item: any) => item?.track?.id)
        .map((item: any) => ({
          id: item.track.id,
          name: item.track.name,
          artists: item.track.artists.map((a: any) => a.name).join(", "),
          album: item.track.album.name,
          thumbnail: item.track.album.images?.[0]?.url || "",
          popularity: item.track.popularity,
          preview: item.track.preview_url,
          permalink: item.track.external_urls?.spotify || "",
          duration: item.track.duration_ms,
        })),
    }));

    // Also get featured playlists
    const featRes = await fetch(
      `https://api.spotify.com/v1/browse/featured-playlists?country=${country}&limit=8`,
      { headers: h, next: { revalidate: 1800 } }
    );
    const featData = await featRes.json();
    const featured = (featData.playlists?.items || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      thumbnail: p.images?.[0]?.url || "",
      permalink: p.external_urls?.spotify || "",
      tracks: p.tracks?.total || 0,
    }));

    return NextResponse.json({ country, charts: result, featured });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
