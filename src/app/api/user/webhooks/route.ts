/**
 * GET    /api/user/webhooks — list current user's webhooks
 * POST   /api/user/webhooks — create (returns plaintext secret ONCE)
 * DELETE /api/user/webhooks?id=... — remove
 *
 * For PATCH (toggle enabled, change events) the user can re-create.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateWebhookSecret, SUPPORTED_EVENTS, type WebhookEvent } from "@/lib/outboundWebhooks";

export const dynamic = "force-dynamic";

async function authedUser() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  return user;
}

export async function GET() {
  const user = await authedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const service = createServiceClient();
  const { data, error } = await service
    .from("user_webhooks")
    .select("id,url,events,enabled,description,last_delivery_at,last_delivery_status,consecutive_failures,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    webhooks: data ?? [],
    supported_events: SUPPORTED_EVENTS,
  });
}

export async function POST(req: NextRequest) {
  const user = await authedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    url?: string;
    events?: string[];
    description?: string;
  } | null;

  if (!body?.url || !/^https?:\/\//.test(body.url)) {
    return NextResponse.json({ error: "url required (http or https)" }, { status: 400 });
  }
  if (body.url.length > 2048) {
    return NextResponse.json({ error: "url too long" }, { status: 400 });
  }

  const events = (body.events ?? []).filter((e) =>
    (SUPPORTED_EVENTS as readonly string[]).includes(e),
  ) as WebhookEvent[];
  if (events.length === 0) {
    return NextResponse.json(
      { error: `events required (one of ${SUPPORTED_EVENTS.join(", ")})` },
      { status: 400 },
    );
  }

  // Plan-gate: same as API tokens — Pro+ for outbound webhooks
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("plan,subscription_plan,is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const plan = (profile?.plan as string | null) ?? (profile?.subscription_plan as string | null) ?? "starter";
  const isAdmin = Boolean(profile?.is_admin);
  if (!isAdmin && !["pro", "studio", "agency", "business", "enterprise"].includes(plan)) {
    return NextResponse.json(
      { error: "Webhooks require Pro plan or higher", upgrade_required: true },
      { status: 403 },
    );
  }

  const secret = generateWebhookSecret();
  const { data, error } = await service
    .from("user_webhooks")
    .insert({
      user_id: user.id,
      url: body.url.trim(),
      secret,
      events,
      description: body.description?.slice(0, 200) ?? null,
    })
    .select("id,url,events,description,created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    webhook: data,
    secret,
    warning: "Save this secret — it's used to verify HMAC signatures and won't be shown again.",
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await authedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const service = createServiceClient();
  const { error } = await service.from("user_webhooks").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
