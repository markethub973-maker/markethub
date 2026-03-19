import { NextResponse } from "next/server";
import { getTopChannels } from "@/lib/youtube";

export async function GET() {
  const channels = await getTopChannels();
  return NextResponse.json(channels);
}
