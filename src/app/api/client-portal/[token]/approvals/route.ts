/**
 * Client portal — approvals-only slice.
 *
 * Returns all scheduled_posts that match the portal's client_name (exact
 * match on scheduled_posts.client) and are currently in an approval state
 * (status != null), oldest first so the client works through them in order.
 *
 * For each post, also returns:
 *   - approval_token (so the client can click through to /approve/[token])
 *   - comments thread (preview, last 3)
 *
 * Auth: token-based (same pattern as the main portal route — no Supabase
 * user session required). Optionally accepts `x-portal-password` header
 * when the portal is password-gated.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyPassword } from "@/lib/portal/password";

export const dynamic = "force-dynamic";

interface PortalRow {
  id: string;
  client_name: string | null;
  expires_at: string | null;
  password_hash?: string | null;
}

interface PostRow {
  id: string;
  caption: string | null;
  platform: string | null;
  date: string | null;
  time: string | null;
  image_url: string | null;
  approval_status: string | null;
  approval_token: string | null;
  approval_note: string | null;
  revision_count: number | null;
  client: string | null;
  client_email: string | null;
  updated_at: string | null;
}

interface CommentRow {
  id: string;
  post_id: string;
  client_email: string | null;
  client_name: string | null;
  comment: string;
  created_at: string;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const supa = createServiceClient();

  // 1. Load portal row
  const { data: portalRaw, error: portalErr } = await supa
    .from("client_portal_links")
    .select("id, client_name, expires_at, password_hash")
    .eq("token", token)
    .maybeSingle();

  if (portalErr || !portalRaw) {
    return NextResponse.json({ error: "Portal not found" }, { status: 404 });
  }
  const portal = portalRaw as PortalRow;

  // 2. Expiry check
  if (portal.expires_at && new Date(portal.expires_at) < new Date()) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  // 3. Password gate (optional)
  if (portal.password_hash) {
    const headerPw = req.headers.get("x-portal-password") ?? "";
    const ok = headerPw && (await verifyPassword(headerPw, portal.password_hash).catch(() => false));
    if (!ok) {
      return NextResponse.json(
        { error: "Password required", requires_password: true },
        { status: 401 },
      );
    }
  }

  if (!portal.client_name) {
    return NextResponse.json({ approvals: [], total: 0, note: "no client_name on portal" });
  }

  // 4. Fetch matching scheduled_posts in approval flow
  const { data: postsRaw, error: postsErr } = await supa
    .from("scheduled_posts")
    .select(
      "id, caption, platform, date, time, image_url, approval_status, approval_token, approval_note, revision_count, client, client_email, updated_at",
    )
    .eq("client", portal.client_name)
    .not("approval_status", "is", null)
    .order("date", { ascending: true });

  if (postsErr) {
    return NextResponse.json({ error: postsErr.message }, { status: 500 });
  }
  const posts = (postsRaw ?? []) as PostRow[];

  // 5. Fetch comment counts for all these posts in one round-trip
  const postIds = posts.map((p) => p.id);
  let commentsByPost = new Map<string, CommentRow[]>();
  if (postIds.length > 0) {
    const { data: commentsRaw } = await supa
      .from("post_approval_comments")
      .select("id, post_id, client_email, client_name, comment, created_at")
      .in("post_id", postIds)
      .eq("is_internal", false)
      .order("created_at", { ascending: false });
    const rows = (commentsRaw ?? []) as CommentRow[];
    commentsByPost = rows.reduce((acc, c) => {
      if (!acc.has(c.post_id)) acc.set(c.post_id, []);
      acc.get(c.post_id)!.push(c);
      return acc;
    }, new Map<string, CommentRow[]>());
  }

  // 6. Shape response
  const approvals = posts.map((p) => {
    const thread = commentsByPost.get(p.id) ?? [];
    return {
      id: p.id,
      caption: p.caption,
      platform: p.platform,
      date: p.date,
      time: p.time,
      image_url: p.image_url,
      approval_status: p.approval_status,
      approval_token: p.approval_token,
      approval_note: p.approval_note,
      revision_count: p.revision_count ?? 0,
      comments_count: thread.length,
      recent_comments: thread.slice(0, 3).map((c) => ({
        id: c.id,
        author: c.client_name || c.client_email || "Client",
        comment: c.comment,
        at: c.created_at,
      })),
      updated_at: p.updated_at,
    };
  });

  const counts = {
    pending: approvals.filter((a) => a.approval_status === "pending").length,
    approved: approvals.filter((a) => a.approval_status === "approved").length,
    rejected: approvals.filter((a) => a.approval_status === "rejected").length,
    total: approvals.length,
  };

  return NextResponse.json({
    client_name: portal.client_name,
    counts,
    approvals,
  });
}
