import { NextRequest, NextResponse } from "next/server";
import { getTrendingVideos } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") || "US";
  const max = parseInt(req.nextUrl.searchParams.get("max") || "12");
  const videos = await getTrendingVideos(region, max);
  return NextResponse.json(videos);
}
