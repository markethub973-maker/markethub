import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Start an Apify actor run ASYNCHRONOUSLY.
 * Returns immediately with a run_id.
 * Apify will call the webhook when done → /api/webhooks/apify
 */

const ACTOR_IDS: Record<string, string> = {
  google_search: "apify~google-search-scraper",
  google_maps: "compass~crawler-google-places",
  instagram_profile: "apify~instagram-scraper",
  instagram_hashtag: "apify~instagram-scraper",
  tiktok_profile: "clockworks~tiktok-scraper",
  tiktok_hashtag: "clockworks~tiktok-scraper",
  facebook_page: "apify~facebook-posts-scraper",
};

function buildInput(actor: string, params: Record<string, unknown>): Record<string, unknown> {
  switch (actor) {
    case "google_search":
      return {
        queries: params.query,
        maxPagesPerQuery: params.pages || 1,
        resultsPerPage: 10,
        countryCode: ((params.country as string) || "ro").toUpperCase(),
        languageCode: params.language || "ro",
      };
    case "google_maps":
      return {
        searchStringsArray: [`${params.query} ${params.location || "Romania"}`],
        maxCrawledPlacesPerSearch: params.limit || 20,
        language: "ro",
        includeOpeningHours: true,
      };
    case "instagram_profile":
      return {
        directUrls: [`https://www.instagram.com/${(params.username as string).replace(/^@/, "")}/`],
        resultsType: "posts",
        resultsLimit: params.limit || 12,
      };
    case "instagram_hashtag":
      return {
        hashtags: [(params.hashtag as string).replace(/^#/, "")],
        resultsType: "hashtags",
        resultsLimit: params.limit || 20,
      };
    case "tiktok_profile":
      return {
        profiles: [(params.username as string).replace(/^@/, "")],
        resultsPerPage: params.limit || 15,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
      };
    case "tiktok_hashtag":
      return {
        hashtags: [(params.hashtag as string).replace(/^#/, "")],
        resultsPerPage: params.limit || 20,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
      };
    case "facebook_page":
      return {
        startUrls: [{ url: (params.page as string).startsWith("http") ? params.page : `https://www.facebook.com/${(params.page as string).replace(/^@/, "")}` }],
        maxPosts: params.limit || 10,
        maxPostComments: 0,
        scrapeAbout: true,
      };
    default:
      return {};
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.APIFY_TOKEN;
  if (!token) return NextResponse.json({ error: "Apify not configured" }, { status: 500 });

  const { actor, params, session_id, goal, step_label } = await req.json();
  if (!actor || !params) return NextResponse.json({ error: "actor and params required" }, { status: 400 });

  const actorId = ACTOR_IDS[actor];
  if (!actorId) return NextResponse.json({ error: "Unknown actor" }, { status: 400 });

  const input = buildInput(actor, params);
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/apify?secret=${process.env.APIFY_WEBHOOK_SECRET || ""}`;

  try {
    // Start async run
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          webhooks: [{
            eventTypes: ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED"],
            requestUrl: webhookUrl,
            payloadTemplate: JSON.stringify({
              eventType: "{{eventType}}",
              actorId: "{{actorId}}",
              actorRunId: "{{actorRunId}}",
              resource: "{{resource}}",
            }),
          }],
        }),
      }
    );

    if (!runRes.ok) {
      const err = await runRes.text();
      return NextResponse.json({ error: `Apify error: ${runRes.status}`, detail: err }, { status: 502 });
    }

    const runData = await runRes.json();
    const apifyRunId = runData.data?.id;

    // Save run to Supabase
    const supa = createServiceClient();
    const { data: savedRun } = await supa
      .from("agent_runs")
      .insert({
        user_id: user.id,
        session_id: session_id || null,
        goal: goal || null,
        step_label: step_label || null,
        actor_type: actor,
        apify_run_id: apifyRunId,
        apify_actor_id: actorId,
        status: "running",
        input_params: params,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      run_id: savedRun?.id,
      apify_run_id: apifyRunId,
      status: "running",
      message: "Actor started — webhook will save results when done",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
