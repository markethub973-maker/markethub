import { NextRequest, NextResponse } from "next/server";

async function getToken(): Promise<string> {
  const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const d = await res.json();
  return d.access_token;
}

async function safeJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { error: text.slice(0, 100) }; }
}

export async function GET(req: NextRequest) {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET)
    return NextResponse.json({ error: "Spotify not configured" }, { status: 500 });

  const country = req.nextUrl.searchParams.get("country") || "RO";

  try {
    const token = await getToken();
    const h = { Authorization: `Bearer ${token}` };

    // Get featured playlists for country (works with client credentials)
    const featRes = await fetch(
      `https://api.spotify.com/v1/browse/featured-playlists?country=${country}&limit=8&locale=ro_RO`,
      { headers: h, cache: "no-store" }
    );
    const featData = await safeJson(featRes);
    const featuredItems: any[] = featData.playlists?.items || [];

    // Try to get new releases too
    const newRes = await fetch(
      `https://api.spotify.com/v1/browse/new-releases?country=${country}&limit=6`,
      { headers: h, cache: "no-store" }
    );
    const newData = await safeJson(newRes);

    // Get tracks for first 3 featured playlists
    const top3 = featuredItems.slice(0, 3);
    const trackResults = await Promise.all(
      top3.map((p: any) =>
        fetch(
          `https://api.spotify.com/v1/playlists/${p.id}/tracks?limit=10&fields=items(track(id,name,artists,album(images,name),popularity,external_urls,preview_url,duration_ms))`,
          { headers: h, cache: "no-store" }
        ).then(safeJson).catch(() => ({ items: [] }))
      )
    );

    const charts = top3.map((p: any, i: number) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      thumbnail: p.images?.[0]?.url || "",
      permalink: p.external_urls?.spotify || "",
      tracks: (trackResults[i]?.items || [])
        .filter((item: any) => item?.track?.id)
        .map((item: any) => ({
          id: item.track.id,
          name: item.track.name,
          artists: item.track.artists.map((a: any) => a.name).join(", "),
          album: item.track.album?.name || "",
          thumbnail: item.track.album?.images?.[0]?.url || "",
          popularity: item.track.popularity || 0,
          preview: item.track.preview_url,
          permalink: item.track.external_urls?.spotify || "",
          duration: item.track.duration_ms || 0,
        })),
    }));

    const featured = featuredItems.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      thumbnail: p.images?.[0]?.url || "",
      permalink: p.external_urls?.spotify || "",
      tracks: p.tracks?.total || 0,
    }));

    const albums = (newData.albums?.items || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      artist: a.artists?.map((ar: any) => ar.name).join(", "),
      thumbnail: a.images?.[0]?.url || "",
      releaseDate: a.release_date,
      permalink: a.external_urls?.spotify || "",
      type: a.album_type,
    }));

    return NextResponse.json({ country, charts, featured, albums });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
