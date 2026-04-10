/**
 * Shared route handler helpers — eliminates boilerplate duplicated across 99+ API routes.
 *
 * BEFORE (repeated in every route):
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
 *   const userPlan = (profile as any)?.plan ?? "free_test";
 *
 * AFTER: const auth = await requireAuth(); if (!auth.ok) return auth.error;
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthResult {
  ok: true;
  userId: string;
  userPlan: string;
}

export interface AuthError {
  ok: false;
  response: NextResponse;
}

/**
 * Verify user session and fetch plan in one call.
 * Usage: const auth = await requireAuth(); if (!auth.ok) return auth.response;
 */
export async function requireAuth(): Promise<AuthResult | AuthError> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const userPlan = (profile as any)?.plan ?? "free_test";

  return { ok: true, userId: user.id, userPlan };
}

// ── Daily limit check ─────────────────────────────────────────────────────────

export interface LimitOk {
  ok: true;
}

export interface LimitError {
  ok: false;
  response: NextResponse;
}

/**
 * Check + increment daily usage limit. Returns error response if exceeded.
 * Usage: const limit = await checkLimit(userId, plan, "apex"); if (!limit.ok) return limit.response;
 */
export async function checkLimit(
  userId: string,
  userPlan: string,
  type: "apex" | "research"
): Promise<LimitOk | LimitError> {
  const limitCheck = await checkAndIncrDailyLimit(userId, userPlan, type);
  if (!limitCheck.allowed) {
    return {
      ok: false,
      response: NextResponse.json(limitExceededResponse(limitCheck, type), { status: 429 }),
    };
  }
  return { ok: true };
}

// ── Apify guard ───────────────────────────────────────────────────────────────

/**
 * Check Apify token is configured. Used at the top of all research routes.
 */
export function requireApify(): NextResponse | null {
  if (!process.env.APIFY_TOKEN) {
    return NextResponse.json(
      { error: "Apify not configured", degraded: true },
      { status: 503 }
    );
  }
  return null;
}

// ── Request body helper ───────────────────────────────────────────────────────

/**
 * Parse request body safely, returning 400 on invalid JSON.
 */
export async function parseBody<T = Record<string, any>>(
  req: NextRequest
): Promise<T | NextResponse> {
  try {
    return (await req.json()) as T;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
