import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ? "SET (" + process.env.SPOTIFY_CLIENT_ID.length + " chars)" : "MISSING",
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? "SET (" + process.env.SPOTIFY_CLIENT_SECRET.length + " chars)" : "MISSING",
    NEWS_API_KEY: process.env.NEWS_API_KEY ? "SET (" + process.env.NEWS_API_KEY.length + " chars)" : "MISSING",
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY ? "SET (" + process.env.YOUTUBE_API_KEY.length + " chars)" : "MISSING",
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });
}
