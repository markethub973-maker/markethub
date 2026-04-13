/**
 * N8N Templates catalog — M10 Sprint 1
 *
 * Lists available automation templates. Public (authed) — users browse
 * the catalog, then trigger via /api/n8n/trigger.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supa
    .from("automation_templates")
    .select("slug,name,description,category,icon,required_plan,inputs_schema")
    .eq("is_active", true)
    .order("category")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // User's enabled configs
  const { data: configs } = await supa
    .from("automation_user_configs")
    .select("template_slug,enabled,config")
    .eq("user_id", user.id);

  const configMap = new Map(
    (configs ?? []).map((c) => [c.template_slug as string, c]),
  );
  const templates = (data ?? []).map((t) => ({
    ...t,
    user_enabled: Boolean(configMap.get(t.slug as string)?.enabled),
    user_config: configMap.get(t.slug as string)?.config ?? null,
  }));

  return NextResponse.json({ ok: true, templates });
}
