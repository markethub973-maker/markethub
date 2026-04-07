import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// ── Admin-only endpoint: applies restrictive RLS policy on profiles table ──────
// Prevents users from self-escalating plan/is_admin/stripe fields via REST PATCH.
// Auth: requires ADMIN_API_SECRET header (same Bearer token used by admin panel).
export async function POST(req: NextRequest) {
  // Verify admin Bearer token
  const auth = req.headers.get("authorization") ?? "";
  const adminSecret = process.env.ADMIN_API_SECRET;
  if (!adminSecret || auth !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supa = createServiceClient();

  // Step 1: list existing UPDATE policies on profiles
  const { data: policies, error: listErr } = await supa.rpc("exec_sql", {
    sql: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public' AND cmd = 'UPDATE';`,
  });

  // Step 2: apply the restrictive policy via raw SQL through pg-meta
  // We use the Supabase Management API (pg-meta) which accepts service role key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const projectRef = supabaseUrl.replace("https://", "").split(".")[0];

  const sql = `
    -- Drop any existing UPDATE policies that allow unrestricted self-update
    DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
    DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
    DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;
    DROP POLICY IF EXISTS "users_update_own_profile_safe" ON public.profiles;

    -- Create restrictive UPDATE policy:
    -- Users CAN update their own row but CANNOT change plan, is_admin,
    -- stripe_customer_id, or stripe_subscription_id.
    CREATE POLICY "users_update_own_profile_safe" ON public.profiles
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (
        auth.uid() = id
        AND plan IS NOT DISTINCT FROM (SELECT plan FROM public.profiles WHERE id = auth.uid())
        AND is_admin IS NOT DISTINCT FROM (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
        AND stripe_customer_id IS NOT DISTINCT FROM (SELECT stripe_customer_id FROM public.profiles WHERE id = auth.uid())
        AND stripe_subscription_id IS NOT DISTINCT FROM (SELECT stripe_subscription_id FROM public.profiles WHERE id = auth.uid())
      );
  `;

  // Try pg-meta v1 endpoint (Supabase Management API)
  const pgMetaRes = await fetch(
    `https://${projectRef}.supabase.co/pg-meta/v1/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "pg-meta-secret": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (pgMetaRes.ok) {
    const result = await pgMetaRes.json().catch(() => ({}));
    return NextResponse.json({
      success: true,
      method: "pg-meta",
      result,
      existingPolicies: policies ?? [],
    });
  }

  const pgMetaError = await pgMetaRes.text().catch(() => "unknown");

  // Fallback: try exec_sql RPC (if it exists)
  const { data: rpcData, error: rpcErr } = await supa.rpc("exec_sql", { sql });
  if (!rpcErr) {
    return NextResponse.json({
      success: true,
      method: "exec_sql_rpc",
      data: rpcData,
      existingPolicies: policies ?? [],
    });
  }

  // Neither method worked — return instructions for manual fix
  return NextResponse.json(
    {
      success: false,
      pgMetaError,
      rpcError: rpcErr?.message,
      manualSql: sql,
      instructions:
        "Run the manualSql in the Supabase Dashboard SQL Editor to apply the RLS fix.",
    },
    { status: 422 }
  );
}

// GET — verify current policy state
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const adminSecret = process.env.ADMIN_API_SECRET;
  if (!adminSecret || auth !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const projectRef = supabaseUrl.replace("https://", "").split(".")[0];

  const checkRes = await fetch(
    `https://${projectRef}.supabase.co/pg-meta/v1/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "pg-meta-secret": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        query:
          "SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public';",
      }),
    }
  );

  if (checkRes.ok) {
    const policies = await checkRes.json();
    const hasSafe = Array.isArray(policies) &&
      policies.some((p: any) => p.policyname === "users_update_own_profile_safe");
    return NextResponse.json({ policies, hasSafe });
  }

  return NextResponse.json({ error: "Could not fetch policies" }, { status: 502 });
}
