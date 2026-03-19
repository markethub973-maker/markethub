import { NextRequest, NextResponse } from "next/server";
import { searchVideos } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "trending";
  const max = parseInt(req.nextUrl.searchParams.get("max") || "12");
  const videos = await searchVideos(q, max);
  return NextResponse.json(videos);
}
