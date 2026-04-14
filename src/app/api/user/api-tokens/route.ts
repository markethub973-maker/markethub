/**
 * User-facing API for managing the user's own API tokens.
 *
 * GET    — list all tokens for the current user
 * POST   — issue a new token (returns plaintext ONCE)
 * DELETE — revoke a token by id (?id=...)
 *
 * Auth: Supabase session cookie only. API tokens CANNOT manage other
 * API tokens — prevents a stolen token from self-renewing indefinitely.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { issueToken, listTokens, revokeToken } from "@/lib/apiTokens";

export const dynamic = "force-dynamic";

export async function GET() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tokens = await listTokens(user.id);
  return NextResponse.json({ ok: true, tokens });
}

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Enforce plan gate — Pro+ only (Creator is trial-equivalent for API access)
  const { data: profile } = await supa
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  const plan = (profile?.plan as string | null) ?? "starter";
  const allowed = ["pro", "studio", "agency", "business"].includes(plan);
  if (!allowed) {
    return NextResponse.json(
      {
        error: "API access requires Pro plan or higher",
        upgrade_required: true,
      },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    expires_in_days?: number;
  } | null;
  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Token name required" }, { status: 400 });
  }

  const expiresInDays = body?.expires_in_days;
  if (expiresInDays != null && (expiresInDays < 1 || expiresInDays > 365 * 5)) {
    return NextResponse.json(
      { error: "expires_in_days must be between 1 and 1825 (5 years)" },
      { status: 400 },
    );
  }

  // Cap: max 10 active tokens per user
  const existing = await listTokens(user.id);
  const activeCount = existing.filter((t) => !t.revoked_at).length;
  if (activeCount >= 10) {
    return NextResponse.json(
      { error: "Maximum 10 active tokens. Revoke an unused one first." },
      { status: 400 },
    );
  }

  const r = await issueToken(user.id, name, { expiresInDays });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });
  return NextResponse.json({
    ok: true,
    id: r.id,
    token: r.token,   // shown ONCE
    prefix: r.prefix,
    warning: "Save this token now — it will not be shown again.",
  });
}

export async function DELETE(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = await revokeToken(user.id, id);
  return NextResponse.json({ ok });
}
