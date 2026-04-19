/**
 * Session-authenticated AI video endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateVideo } from "@/lib/aiVideo";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — video takes time

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    mode?: "text-to-video" | "image-to-video";
    prompt?: string;
    source_image_url?: string;
    duration_sec?: 5 | 10;
    aspect_ratio?: "16:9" | "9:16" | "1:1";
    seed?: number;
  } | null;

  if (!body) return NextResponse.json({ error: "body required" }, { status: 400 });

  if (body.prompt && body.prompt.length > 2000) {
    return NextResponse.json({ error: "prompt too long (max 2000)" }, { status: 400 });
  }

  // Plan gate — admin bypass
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("plan,subscription_plan,is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const plan = (profile?.plan as string | null) ?? (profile?.subscription_plan as string | null) ?? "starter";
  const isAdmin = Boolean(profile?.is_admin);
  if (!isAdmin && !["pro", "studio", "agency", "business", "agency"].includes(plan)) {
    return NextResponse.json(
      { error: "AI video generation requires Pro plan or higher", upgrade_required: true },
      { status: 403 },
    );
  }

  const result = await generateVideo({
    userId: user.id,
    mode: body.mode ?? "text-to-video",
    prompt: body.prompt,
    source_image_url: body.source_image_url,
    duration_sec: body.duration_sec ?? 5,
    aspect_ratio: body.aspect_ratio ?? "9:16",
    seed: body.seed,
    source_context: "studio",
  });

  return NextResponse.json(result, { status: result.ok ? 202 : 500 });
}

export async function GET(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("limit") ?? "24"), 1), 100);
  const { data, error } = await supa
    .from("ai_video_generations")
    .select("id,provider,model,mode,prompt,source_image_url,duration_sec,aspect_ratio,video_url,thumbnail_url,status,cost_usd,duration_ms,created_at,finished_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, generations: data ?? [] });
}
