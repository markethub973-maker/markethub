import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type StepActor =
  | "google_search"
  | "google_maps"
  | "google_maps_reviews"
  | "instagram_profile"
  | "instagram_hashtag"
  | "tiktok_profile"
  | "tiktok_hashtag"
  | "facebook_page"
  | "youtube_channel"
  | "youtube_search"
  | "reddit_search"
  | "reddit_subreddit"
  | "website_crawler";

interface Step {
  actor: StepActor;
  params: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { step }: { step: Step } = await req.json();
  if (!step?.actor) return NextResponse.json({ error: "Step required" }, { status: 400 });

  const base = req.nextUrl.origin;

  try {
    let result: unknown;

    switch (step.actor) {
      case "google_search": {
        const r = await fetch(`${base}/api/research/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") || "" },
          body: JSON.stringify({
            query: step.params.query,
            country: step.params.country || "ro",
            pages: step.params.pages || 1,
          }),
        });
        result = await r.json();
        break;
      }

      case "google_maps": {
        const r = await fetch(`${base}/api/research/maps`, {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") || "" },
          body: JSON.stringify({
            query: step.params.query,
            location: step.params.location || "Romania",
            limit: step.params.limit || 20,
          }),
        });
        result = await r.json();
        break;
      }

      case "instagram_profile": {
        const r = await fetch(`${base}/api/research/instagram`, {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") || "" },
          body: JSON.stringify({ username: step.params.username, limit: step.params.limit || 12 }),
        });
        result = await r.json();
        break;
      }

      case "instagram_hashtag": {
        const r = await fetch(`${base}/api/research/instagram`, {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") || "" },
          body: JSON.stringify({ hashtag: step.params.hashtag, limit: step.params.limit || 20 }),
        });
        result = await r.json();
        break;
      }

      case "tiktok_profile": {
        const r = await fetch(`${base}/api/research/tiktok`, {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") || "" },
          body: JSON.stringify({ username: step.params.username, limit: step.params.limit || 15 }),
        });
        result = await r.json();
        break;
      }

      case "tiktok_hashtag": {
        const r = await fetch(`${base}/api/research/tiktok`, {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") || "" },
          body: JSON.stringify({ hashtag: step.params.hashtag, limit: step.params.limit || 20 }),
        });
        result = await r.json();
        break;
      }

      case "facebook_page": {
        const r = await fetch(`${base}/api/research/facebook`, {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") || "" },
          body: JSON.stringify({ page: step.params.page, limit: step.params.limit || 10 }),
        });
        result = await r.json();
        break;
      }

      case "youtube_channel": {
        const r = await fetch(`${base}/api/research/youtube`, {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") || "" },
          body: JSON.stringify({ channel: step.params.channel, limit: step.params.limit || 15 }),
        });
        result = await r.json();
        break;
      }

      case "youtube_search": {
        const r = await fetch(`${base}/api/research/youtube`, {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") || "" },
          body: JSON.stringify({ keyword: step.params.keyword, limit: step.params.limit || 15 }),
        });
        result = await r.json();
        break;
      }

      case "reddit_search": {
        const r = await fetch(`${base}/api/research/reddit`, {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") || "" },
          body: JSON.stringify({ query: step.params.query, limit: step.params.limit || 20 }),
        });
        result = await r.json();
        break;
      }

      case "reddit_subreddit": {
        const r = await fetch(`${base}/api/research/reddit`, {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") || "" },
          body: JSON.stringify({ subreddit: step.params.subreddit, query: step.params.query, limit: step.params.limit || 20 }),
        });
        result = await r.json();
        break;
      }

      case "google_maps_reviews": {
        const r = await fetch(`${base}/api/research/maps-reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") || "" },
          body: JSON.stringify({ placeName: step.params.placeName, placeUrl: step.params.placeUrl, maxReviews: step.params.maxReviews || 30 }),
        });
        result = await r.json();
        break;
      }

      case "website_crawler": {
        const r = await fetch(`${base}/api/research/website`, {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") || "" },
          body: JSON.stringify({ url: step.params.url, maxPages: step.params.maxPages || 5 }),
        });
        result = await r.json();
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown actor" }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
