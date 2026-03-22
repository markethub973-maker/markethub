import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ? "SET" : "MISSING",
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? "SET" : "MISSING",
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY ? "SET" : "MISSING",
    NEWS_API_KEY: process.env.NEWS_API_KEY ? "SET" : "MISSING",
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? "SET" : "MISSING",
  });
}
