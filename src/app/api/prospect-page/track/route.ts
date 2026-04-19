/**
 * GET /api/prospect-page/track?slug=xxx — Visit tracking for prospect pages.
 *
 * Increments visit_count and updates last_visited_at.
 * No auth — called from the public prospect page on load (as img src or fetch).
 * Returns a 1x1 transparent GIF so it works as a tracking pixel too.
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");

  if (slug) {
    try {
      const svc = createServiceClient();
      await svc.rpc("increment_prospect_visit", { p_slug: slug });
    } catch {
      // Best-effort — if the RPC doesn't exist, fall back to raw update
      try {
        const svc = createServiceClient();
        // Atomic increment via raw SQL is ideal, but rpc may not exist yet.
        // Fallback: read-then-write (acceptable for visit counts)
        const { data } = await svc
          .from("prospect_pages")
          .select("visit_count")
          .eq("slug", slug)
          .maybeSingle();

        if (data) {
          await svc
            .from("prospect_pages")
            .update({
              visit_count: (data.visit_count || 0) + 1,
              last_visited_at: new Date().toISOString(),
            })
            .eq("slug", slug);
        }
      } catch {
        // Completely non-critical
      }
    }
  }

  return new Response(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
