import { NextResponse } from "next/server";

async function getSpotifyToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    next: { revalidate: 3500 },
  });

  const data = await res.json();
  return data.access_token;
}

export async function GET() {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return NextResponse.json({ error: "Spotify not configured" }, { status: 500 });
  }

  try {
    const token = await getSpotifyToken();
    const headers = { Authorization: `Bearer ${token}` };

    const [releasesRes, playlistsRes] = await Promise.all([
      fetch("https://api.spotify.com/v1/browse/new-releases?limit=10&country=RO", { headers, next: { revalidate: 3600 } }),
      fetch("https://api.spotify.com/v1/browse/featured-playlists?limit=6&country=RO", { headers, next: { revalidate: 3600 } }),
    ]);

    const [releasesData, playlistsData] = await Promise.all([
      releasesRes.json(),
      playlistsRes.json(),
    ]);

    const albums = (releasesData.albums?.items || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      artist: a.artists.map((ar: any) => ar.name).join(", "),
      thumbnail: a.images?.[0]?.url || "",
      releaseDate: a.release_date,
      totalTracks: a.total_tracks,
      permalink: a.external_urls?.spotify || "",
      type: a.album_type,
    }));

    const playlists = (playlistsData.playlists?.items || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      thumbnail: p.images?.[0]?.url || "",
      tracks: p.tracks?.total || 0,
      permalink: p.external_urls?.spotify || "",
    }));

    return NextResponse.json({ albums, playlists });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
