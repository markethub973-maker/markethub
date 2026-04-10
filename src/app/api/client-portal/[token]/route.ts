import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchIgSnapshot, fetchTtSnapshot, isStale } from "@/lib/portal/refreshData";
import { verifyPassword } from "@/lib/portal/password";

// ── Brute-force protection on password-protected portals ─────────────────────
async function checkPortalPasswordRateLimit(ip: string, token: string): Promise<boolean> {
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    const key = `portal_pw:${ip}:${token.slice(0, 8)}`; // per IP per portal
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 300); // 5-minute window
    return count <= 5; // max 5 password attempts per 5 min
  } catch {
    return true; // fail open — don't block if Redis is down
  }
}

const FULL_FIELDS =
  "id, token, client_name, ig_username, tt_username, data, view_count, expires_at, updated_at, agency_name, agency_logo_url, accent_color, password_hash";
const LEGACY_FIELDS =
  "id, token, client_name, ig_username, tt_username, data, view_count, expires_at, updated_at";

function isSchemaCacheError(err: { message?: string } | null): boolean {
  if (!err) return false;
  const msg = err.message ?? "";
  return (
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("Could not find the") ||
    msg.includes("column")
  );
}

// Strip the password hash from outgoing rows — clients only see has_password.
function sanitize(row: any): any {
  if (!row) return row;
  const { password_hash, ...rest } = row;
  return { ...rest, has_password: !!password_hash };
}

async function loadLink(token: string) {
  const svc = createServiceClient();
  const first = await svc
    .from("client_portal_links")
    .select(FULL_FIELDS)
    .eq("token", token)
    .single();
  let link: any = first.data;
  let error = first.error;

  if (error && isSchemaCacheError(error)) {
    const retry = await svc
      .from("client_portal_links")
      .select(LEGACY_FIELDS)
      .eq("token", token)
      .single();
    link = retry.data;
    error = retry.error;
  }

  return { link, error, svc };
}

// GET — public endpoint, no auth required.
// If the link is password-protected, requires X-Portal-Password header
// (or `?p=` query param) and returns 401 with `requires_password: true`
// when missing/wrong, so the portal page can prompt the visitor.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const { link, error, svc } = await loadLink(token);

  if (error || !link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  // Check expiry
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  // ── Password gate ─────────────────────────────────────────────────────
  if (link.password_hash) {
    const provided =
      req.headers.get("x-portal-password") ??
      req.nextUrl.searchParams.get("p") ??
      "";

    if (!provided) {
      return NextResponse.json(
        { error: "Password required", requires_password: true },
        { status: 401 },
      );
    }

    // Rate limit password attempts: max 5 per 5 min per IP per portal
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const allowed = await checkPortalPasswordRateLimit(ip, token);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in 5 minutes.", requires_password: true },
        { status: 429 },
      );
    }

    const ok = await verifyPassword(provided, link.password_hash);
    if (!ok) {
      return NextResponse.json(
        { error: "Wrong password", requires_password: true, wrong_password: true },
        { status: 401 },
      );
    }
  }

  // ── Live refresh: if data is older than the cooldown, re-fetch IG/TT ──
  // We do this synchronously so the client sees the fresh numbers on this
  // very response. Failures are non-fatal — the stale snapshot stays.
  const currentData = (link.data as Record<string, any>) || {};
  const lastRefreshedAt: number | undefined = currentData.last_refreshed_at;

  if (isStale(lastRefreshedAt) && (link.ig_username || link.tt_username)) {
    const [igFresh, ttFresh] = await Promise.all([
      link.ig_username ? fetchIgSnapshot(link.ig_username) : Promise.resolve(null),
      link.tt_username ? fetchTtSnapshot(link.tt_username) : Promise.resolve(null),
    ]);

    // Merge fresh values over the existing snapshot — preserve fields that
    // we couldn't refresh (e.g. notes, agency-set bio overrides).
    const merged: Record<string, any> = { ...currentData };
    if (igFresh) {
      merged.ig_followers = igFresh.ig_followers;
      merged.ig_following = igFresh.ig_following;
      merged.ig_posts = igFresh.ig_posts;
      merged.ig_engagement = igFresh.ig_engagement;
      merged.ig_bio = igFresh.ig_bio;
      merged.ig_avatar = igFresh.ig_avatar;
      merged.ig_verified = igFresh.ig_verified;
      if (igFresh.posts.length > 0) merged.posts = igFresh.posts;
    }
    if (ttFresh) {
      merged.tt_followers = ttFresh.tt_followers;
      merged.tt_likes = ttFresh.tt_likes;
      merged.tt_videos = ttFresh.tt_videos;
    }

    // Only persist if at least one platform succeeded — otherwise keep the
    // last_refreshed_at unchanged so we'll try again on the next view.
    if (igFresh || ttFresh) {
      merged.last_refreshed_at = Date.now();
      const nowIso = new Date().toISOString();
      await svc
        .from("client_portal_links")
        .update({
          data: merged,
          view_count: (link.view_count || 0) + 1,
          updated_at: nowIso,
        })
        .eq("id", link.id);

      // Reflect the fresh numbers in the response without re-querying
      link.data = merged;
      link.view_count = (link.view_count || 0) + 1;
      link.updated_at = nowIso;
      return NextResponse.json({ link: sanitize(link) });
    }
  }

  // Increment view count (non-fatal) — fire-and-forget
  svc
    .from("client_portal_links")
    .update({ view_count: (link.view_count || 0) + 1, updated_at: new Date().toISOString() })
    .eq("id", link.id)
    .then(() => {});

  return NextResponse.json({ link: sanitize(link) });
}
