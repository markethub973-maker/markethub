import { NextResponse } from "next/server";

async function getSpotifyToken(): Promise<string> {
  const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const data = await res.json();
  return data.access_token;
}

async function safeJson(r: Response) {
  const t = await r.text();
  try { return JSON.parse(t); } catch { return {}; }
}

export async function GET() {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return NextResponse.json({ error: "Spotify not configured" }, { status: 500 });
  }

  try {
    const token = await getSpotifyToken();
    const headers = { Authorization: `Bearer ${token}` };

    // Only use featured-playlists (works with client credentials)
    const [featRO, featUS, featUK] = await Promise.all([
      fetch("https://api.spotify.com/v1/browse/featured-playlists?limit=6&country=RO", { headers, cache: "no-store" }).then(safeJson),
      fetch("https://api.spotify.com/v1/browse/featured-playlists?limit=4&country=US", { headers, cache: "no-store" }).then(safeJson),
      fetch("https://api.spotify.com/v1/browse/featured-playlists?limit=4&country=GB", { headers, cache: "no-store" }).then(safeJson),
    ]);

    const playlists = (featRO.playlists?.items || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      thumbnail: p.images?.[0]?.url || "",
      tracks: p.tracks?.total || 0,
      permalink: p.external_urls?.spotify || "",
    }));

    const globalPlaylists = [
      ...(featUS.playlists?.items || []),
      ...(featUK.playlists?.items || []),
    ].map((p: any) => ({
      id: p.id,
      name: p.name,
      thumbnail: p.images?.[0]?.url || "",
      tracks: p.tracks?.total || 0,
      permalink: p.external_urls?.spotify || "",
    }));

    return NextResponse.json({ playlists, globalPlaylists, albums: [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
