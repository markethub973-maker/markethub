import { NextRequest, NextResponse } from "next/server";

async function getToken(): Promise<string> {
  const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  return (await res.json()).access_token;
}

async function safeJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { error: text.slice(0, 100) }; }
}

export async function GET(req: NextRequest) {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET)
    return NextResponse.json({ error: "Spotify not configured" }, { status: 500 });

  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q.trim()) return NextResponse.json({ error: "Query required" }, { status: 400 });

  try {
    const token = await getToken();
    const h = { Authorization: `Bearer ${token}` };

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=artist&limit=1`,
      { headers: h, cache: "no-store" }
    );
    const searchData = await safeJson(searchRes);
    if (searchData.error) return NextResponse.json({ error: "Spotify search error: " + searchData.error }, { status: 400 });
    const artist = searchData.artists?.items?.[0];
    if (!artist) return NextResponse.json({ error: "Artist not found: " + q }, { status: 404 });

    const [topTracksRes, albumsRes, relatedRes] = await Promise.all([
      fetch(`https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=US`, { headers: h, cache: "no-store" }),
      fetch(`https://api.spotify.com/v1/artists/${artist.id}/albums?include_groups=album,single&market=US&limit=6`, { headers: h, cache: "no-store" }),
      fetch(`https://api.spotify.com/v1/artists/${artist.id}/related-artists`, { headers: h, cache: "no-store" }),
    ]);

    const [topTracksData, albumsData, relatedData] = await Promise.all([
      safeJson(topTracksRes),
      safeJson(albumsRes),
      safeJson(relatedRes),
    ]);

    return NextResponse.json({
      artist: {
        id: artist.id,
        name: artist.name,
        genres: artist.genres || [],
        followers: artist.followers?.total || 0,
        popularity: artist.popularity || 0,
        thumbnail: artist.images?.[0]?.url || "",
        permalink: artist.external_urls?.spotify || "",
      },
      topTracks: (topTracksData.tracks || []).slice(0, 10).map((t: any) => ({
        id: t.id,
        name: t.name,
        album: t.album?.name || "",
        thumbnail: t.album?.images?.[0]?.url || "",
        popularity: t.popularity || 0,
        preview: t.preview_url,
        permalink: t.external_urls?.spotify || "",
        duration: t.duration_ms || 0,
      })),
      albums: (albumsData.items || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        type: a.album_type,
        releaseDate: a.release_date,
        thumbnail: a.images?.[0]?.url || "",
        permalink: a.external_urls?.spotify || "",
        totalTracks: a.total_tracks,
      })),
      related: (relatedData.artists || []).slice(0, 6).map((a: any) => ({
        id: a.id,
        name: a.name,
        followers: a.followers?.total || 0,
        popularity: a.popularity || 0,
        thumbnail: a.images?.[2]?.url || a.images?.[0]?.url || "",
        genres: a.genres?.slice(0, 2) || [],
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
