import { NextResponse } from "next/server";

export async function GET() {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return NextResponse.json({ error: "Spotify creds missing" });
  }

  const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const tokenText = await tokenRes.text();
  let tokenData: any;
  try { tokenData = JSON.parse(tokenText); } catch { return NextResponse.json({ tokenError: tokenText.slice(0, 200) }); }

  if (!tokenData.access_token) {
    return NextResponse.json({ tokenError: tokenData });
  }

  const h = { Authorization: `Bearer ${tokenData.access_token}` };
  const featRes = await fetch("https://api.spotify.com/v1/browse/featured-playlists?limit=3&country=US", { headers: h, cache: "no-store" });
  const featText = await featRes.text();
  let featData: any;
  try { featData = JSON.parse(featText); } catch { featData = { raw: featText.slice(0, 300) }; }

  return NextResponse.json({
    tokenOk: true,
    featStatus: featRes.status,
    featData,
  });
}
