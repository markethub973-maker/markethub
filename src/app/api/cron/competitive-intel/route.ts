/**
 * GET /api/cron/competitive-intel — weekly scan of 3-5 competitors.
 *
 * Runs weekly via n8n. Fetches the homepage + /pricing of each
 * competitor, asks Claude to summarize what's new / noteworthy +
 * recommend ONE reaction we could ship. Emails the brief to alex@.
 *
 * Auth: x-brain-cron-secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/llm";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const COMPETITORS = [
  { name: "Buffer",       urls: ["https://buffer.com", "https://buffer.com/pricing"] },
  { name: "Hootsuite",    urls: ["https://www.hootsuite.com", "https://www.hootsuite.com/plans"] },
  { name: "Later",        urls: ["https://later.com", "https://later.com/pricing"] },
  { name: "SocialPilot",  urls: ["https://www.socialpilot.co", "https://www.socialpilot.co/pricing"] },
];

async function fetchSnippet(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MarketHubPro/1.0 (competitive-intel)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2500);
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest) {
  if (req.headers.get("x-brain-cron-secret") !== process.env.BRAIN_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snippets: Array<{ name: string; text: string }> = [];
  for (const c of COMPETITORS) {
    const parts: string[] = [];
    for (const u of c.urls) {
      const s = await fetchSnippet(u);
      if (s) parts.push(s);
    }
    if (parts.length) snippets.push({ name: c.name, text: parts.join("\n---\n").slice(0, 4500) });
  }

  if (!snippets.length) {
    return NextResponse.json({ ok: false, error: "No snippets fetched" });
  }

  const sys = `You are Alex, founder/CEO of MarketHub Pro (a done-for-you AI marketing platform for SMBs).
You're reviewing what ${snippets.length} competitors are saying publicly this week.
Produce a short strategic brief for yourself:
- 3 specific things worth noting (new features, pricing changes, messaging angles)
- 1 "so what" recommendation (what should MarketHub Pro do in the next 7 days to react or counter-position)

Plain-text email format, max 180 words total. Warm human tone — no consultancy jargon.`;

  const user = snippets.map((s) => `### ${s.name}\n${s.text}`).join("\n\n");
  const brief = await generateText(sys, user, { maxTokens: 700 });

  // Email the brief to operator
  if (process.env.RESEND_API_KEY && brief) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Alex <alex@markethubpromo.com>",
        to: ["markethub973@gmail.com"],
        subject: `📊 Competitive intel — ${new Date().toLocaleDateString()}`,
        text: brief,
      }),
    });
  }

  return NextResponse.json({ ok: true, competitors: snippets.map((s) => s.name), brief });
}
