/**
 * GET /api/brain/web-read?url=https://example.com
 * POST /api/brain/web-read { url }
 *
 * Alex's autonomous web reader — fetches a page and extracts:
 * - Title, text content
 * - Emails, phone numbers
 * - Marketing agency classification (auto-verify prospects)
 *
 * Auth: BRAIN_CRON_SECRET or admin session.
 */

import { NextRequest, NextResponse } from "next/server";
import { webRead, classifyProspect } from "@/lib/webSearch";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

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
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  try {
    const result = await webRead(url);
    const classification = classifyProspect(result.text, result.title);

    return NextResponse.json({
      ...result,
      classification,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { url?: string; verify_prospect?: boolean };
  if (!body.url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  try {
    const result = await webRead(body.url);
    const classification = classifyProspect(result.text, result.title);

    return NextResponse.json({
      ...result,
      classification,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
