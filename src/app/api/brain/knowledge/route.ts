/**
 * GET /api/brain/knowledge?category=framework|patterns|clients
 *
 * Read-only knowledge base feeder for /brain-private/knowledge UI.
 *
 * Auth: brain_admin cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.cookies.get("brain_admin")?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const category = req.nextUrl.searchParams.get("category") ?? "framework";
  const svc = createServiceClient();

  if (category === "framework") {
    const { data } = await svc
      .from("brain_knowledge_base")
      .select("id, category, name, summary, content, tags, source, confidence")
      .eq("category", "framework")
      .order("name", { ascending: true })
      .limit(100);
    return NextResponse.json({ ok: true, entries: data ?? [] });
  }

  if (category === "patterns") {
    const { data } = await svc
      .from("brain_intermediary_patterns")
      .select("*")
      .order("our_product_match_score", { ascending: false })
      .limit(200);
    return NextResponse.json({ ok: true, entries: data ?? [] });
  }

  if (category === "clients") {
    const { data } = await svc
      .from("brain_client_needs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    return NextResponse.json({ ok: true, entries: data ?? [] });
  }

  return NextResponse.json({ ok: false, error: "bad category" }, { status: 400 });
}
