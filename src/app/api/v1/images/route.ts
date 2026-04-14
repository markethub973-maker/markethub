/**
 * POST /api/v1/images — generate an AI image for the authenticated user.
 *
 * Body:
 *   {
 *     "prompt": "A dog in sunglasses on a beach at golden hour",
 *     "aspect_ratio": "1:1" | "16:9" | "9:16" | "4:5",  // optional, default 1:1
 *     "negative_prompt": "blurry, low quality",         // optional
 *     "seed": 42                                        // optional
 *   }
 *
 * Returns 202 with { id, image_url, cost_usd, duration_ms }.
 * Plan-gated: Pro+ only (Fal/Replicate bill us per image).
 * Rate-limited: inherits proxy.ts "ai" tier (20/min/IP).
 *
 * GET returns the user's recent generations.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/apiTokens";
import { generateImage } from "@/lib/aiImage";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await verifyToken(
    req.headers.get("authorization"),
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  );
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing API token" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    prompt?: string;
    aspect_ratio?: "1:1" | "16:9" | "9:16" | "4:5";
    negative_prompt?: string;
    seed?: number;
    source_context?: string;
    source_ref?: string;
  } | null;

  if (!body?.prompt || body.prompt.trim().length < 3) {
    return NextResponse.json(
      { error: "prompt required (min 3 chars)" },
      { status: 400 },
    );
  }
  if (body.prompt.length > 2000) {
    return NextResponse.json({ error: "prompt too long (max 2000 chars)" }, { status: 400 });
  }

  // Plan gate — admins bypass.
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("plan,subscription_plan,is_admin")
    .eq("id", auth.user_id)
    .maybeSingle();
  const plan = (profile?.plan as string | null) ?? (profile?.subscription_plan as string | null) ?? "starter";
  const isAdmin = Boolean(profile?.is_admin);
  if (!isAdmin && !["pro", "studio", "agency", "business"].includes(plan)) {
    return NextResponse.json(
      {
        error: "AI image generation requires Pro plan or higher",
        upgrade_required: true,
      },
      { status: 403 },
    );
  }

  const result = await generateImage({
    userId: auth.user_id,
    prompt: body.prompt.trim(),
    negative_prompt: body.negative_prompt,
    aspect_ratio: body.aspect_ratio ?? "1:1",
    seed: body.seed,
    source_context: body.source_context ?? "api",
    source_ref: body.source_ref,
  });

  return NextResponse.json(result, { status: result.ok ? 202 : 500 });
}

export async function GET(req: NextRequest) {
  const auth = await verifyToken(
    req.headers.get("authorization"),
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  );
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing API token" }, { status: 401 });
  }

  const limit = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get("limit") ?? "20"), 1),
    100,
  );

  const service = createServiceClient();
  const { data, error } = await service
    .from("ai_image_generations")
    .select(
      "id,provider,model,prompt,aspect_ratio,image_url,status,cost_usd,duration_ms,source_context,created_at,finished_at",
    )
    .eq("user_id", auth.user_id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, generations: data ?? [] });
}
