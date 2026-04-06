import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Apify Webhook receiver
 * Configure in Apify: Actor run → Settings → Webhooks
 * URL: https://markethubpromo.com/api/webhooks/apify
 * Events: ACTOR.RUN.SUCCEEDED, ACTOR.RUN.FAILED
 */
export async function POST(req: NextRequest) {
  // Verify webhook secret — header only (never accept query params to avoid secret in logs)
  const secret = req.headers.get("x-webhook-secret");
  if (process.env.APIFY_WEBHOOK_SECRET && secret !== process.env.APIFY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { eventType, actorId, actorRunId, resource } = body;

  // Find the agent_run that started this Apify run
  const { data: agentRun } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("apify_run_id", actorRunId)
    .single();

  if (!agentRun) {
    // Unknown run — still log it
    console.log(`[Apify Webhook] Unknown run ${actorRunId}, event: ${eventType}`);
    return NextResponse.json({ received: true });
  }

  if (eventType === "ACTOR.RUN.FAILED" || resource?.status === "FAILED") {
    await supabase
      .from("agent_runs")
      .update({ status: "failed", finished_at: new Date().toISOString() })
      .eq("id", agentRun.id);
    return NextResponse.json({ received: true });
  }

  if (eventType !== "ACTOR.RUN.SUCCEEDED" && resource?.status !== "SUCCEEDED") {
    return NextResponse.json({ received: true });
  }

  // Fetch dataset items from Apify
  const token = process.env.APIFY_TOKEN;
  const datasetId = resource?.defaultDatasetId;
  if (!datasetId || !token) {
    return NextResponse.json({ received: true });
  }

  try {
    const dataRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true&limit=100`
    );
    const items = await dataRes.json();

    if (!Array.isArray(items) || items.length === 0) {
      await supabase.from("agent_runs").update({ status: "done", leads_count: 0, finished_at: new Date().toISOString() }).eq("id", agentRun.id);
      return NextResponse.json({ received: true });
    }

    // Map items to leads based on actor type
    const actorType = agentRun.actor_type as string;
    const leads = mapItemsToLeads(items, actorType, agentRun);

    // Insert leads into research_leads
    if (leads.length > 0) {
      await supabase.from("research_leads").insert(leads);
    }

    // Update agent_run
    await supabase
      .from("agent_runs")
      .update({
        status: "done",
        leads_count: leads.length,
        raw_data: items.slice(0, 20), // store first 20 for preview
        finished_at: new Date().toISOString(),
      })
      .eq("id", agentRun.id);

    console.log(`[Apify Webhook] Run ${actorRunId} done — ${leads.length} leads saved`);
    return NextResponse.json({ received: true, leads_saved: leads.length });
  } catch (err: any) {
    console.error("[Apify Webhook] Error:", err.message);
    await supabase.from("agent_runs").update({ status: "failed" }).eq("id", agentRun.id);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function mapItemsToLeads(items: any[], actorType: string, agentRun: any) {
  const base = {
    user_id: agentRun.user_id,
    agent_session_id: agentRun.session_id,
    goal: agentRun.goal,
    source: actorType,
    created_at: new Date().toISOString(),
  };

  switch (actorType) {
    case "google_maps":
      return items.map((p: any) => ({
        ...base,
        lead_type: "local_business",
        name: p.title || p.name,
        category: p.categoryName || p.categories?.[0],
        address: p.address,
        city: p.city,
        phone: p.phone,
        website: p.website,
        email: p.email || null,
        rating: p.totalScore || p.rating,
        reviews_count: p.reviewsCount,
        url: p.url,
        extra_data: { lat: p.location?.lat, lng: p.location?.lng, opening_hours: p.openingHours },
      }));

    case "google_search":
      return (items || []).flatMap((page: any) =>
        (page.organicResults || []).map((r: any) => ({
          ...base,
          lead_type: "website",
          name: r.title,
          url: r.url,
          address: r.displayedUrl,
          extra_data: { position: r.position, description: r.description },
        }))
      );

    case "instagram_profile":
    case "instagram_hashtag":
      return items.map((p: any) => ({
        ...base,
        lead_type: "instagram",
        name: p.ownerUsername || p.ownerFullName,
        url: p.url,
        extra_data: {
          followers: p.ownerFollowersCount,
          likes: p.likesCount,
          comments: p.commentsCount,
          caption: p.caption?.slice(0, 200),
          thumbnail: p.displayUrl,
        },
      }));

    case "tiktok_profile":
    case "tiktok_hashtag":
      return items.map((v: any) => ({
        ...base,
        lead_type: "tiktok",
        name: v.authorMeta?.name || v.authorMeta?.nickName,
        url: v.webVideoUrl,
        extra_data: {
          followers: v.authorMeta?.fans,
          plays: v.playCount,
          likes: v.diggCount,
          description: v.text?.slice(0, 200),
        },
      }));

    case "facebook_page":
      return items.map((p: any) => ({
        ...base,
        lead_type: "facebook",
        name: p.pageName,
        url: p.pageUrl,
        extra_data: {
          followers: p.pageFollowers,
          likes: p.likes,
          text: p.text?.slice(0, 200),
        },
      }));

    default:
      return [];
  }
}
