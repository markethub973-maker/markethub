/**
 * Session-authenticated variant of /api/v1/images.
 * Same logic, but uses the browser cookie session instead of API token
 * so the /studio/image UI can call it without the user juggling tokens.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateImage } from "@/lib/aiImage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function authedUser() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  return user;
}

export async function POST(req: NextRequest) {
  const user = await authedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    prompt?: string;
    aspect_ratio?: "1:1" | "16:9" | "9:16" | "4:5";
    negative_prompt?: string;
    seed?: number;
  } | null;

  if (!body?.prompt || body.prompt.trim().length < 3) {
    return NextResponse.json({ error: "prompt required (min 3 chars)" }, { status: 400 });
  }
  if (body.prompt.length > 2000) {
    return NextResponse.json({ error: "prompt too long (max 2000 chars)" }, { status: 400 });
  }

  // Plan gate — admins bypass (so platform owner can demo + QA without
  // burning a subscription slot on their own account).
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
      {
        error: "AI image generation requires Pro plan or higher",
        upgrade_required: true,
      },
      { status: 403 },
    );
  }

  const result = await generateImage({
    userId: user.id,
    prompt: body.prompt.trim(),
    negative_prompt: body.negative_prompt,
    aspect_ratio: body.aspect_ratio ?? "1:1",
    seed: body.seed,
    source_context: "studio",
  });

  return NextResponse.json(result, { status: result.ok ? 202 : 500 });
}

export async function GET(req: NextRequest) {
  const user = await authedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supa = await createClient();
  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("limit") ?? "24"), 1), 100);
  const { data, error } = await supa
    .from("ai_image_generations")
    .select("id,provider,model,prompt,aspect_ratio,image_url,status,cost_usd,duration_ms,source_context,created_at,finished_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, generations: data ?? [] });
}
