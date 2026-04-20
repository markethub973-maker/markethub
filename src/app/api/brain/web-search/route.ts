/**
 * GET /api/brain/web-search?q=query&num=5
 * POST /api/brain/web-search { query, num, country, lang }
 *
 * Alex's autonomous web search — uses Serper.dev (Google Search API).
 * Auth: BRAIN_CRON_SECRET or admin session.
 */

import { NextRequest, NextResponse } from "next/server";
import { webSearch } from "@/lib/webSearch";
import { isAlexPaused, pausedResponse } from "@/lib/killSwitch";


export const dynamic = "force-dynamic";

function authOk(req: NextRequest): boolean {
  const secret = req.headers.get("x-brain-cron-secret");
  if (secret && process.env.BRAIN_CRON_SECRET && secret === process.env.BRAIN_CRON_SECRET) {
    return true;
  }
  const cronAuth = req.headers.get("authorization");
  if (cronAuth && process.env.CRON_SECRET && cronAuth === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  if (isAlexPaused()) return pausedResponse();
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "q parameter required" }, { status: 400 });
  }

  const num = parseInt(req.nextUrl.searchParams.get("num") || "10", 10);
  const country = req.nextUrl.searchParams.get("country") || undefined;
  const lang = req.nextUrl.searchParams.get("lang") || undefined;

  try {
    const results = await webSearch(q, { num, country, lang });
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (isAlexPaused()) return pausedResponse();
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    query?: string;
    num?: number;
    country?: string;
    lang?: string;
  };

  if (!body.query) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  try {
    const results = await webSearch(body.query, {
      num: body.num,
      country: body.country,
      lang: body.lang,
    });
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
