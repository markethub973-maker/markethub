// Server-side helpers that re-fetch Instagram + TikTok profile data directly
// from RapidAPI for client portal "live" links. Used by the public portal
// token endpoint, which has no user session — these helpers bypass the
// authenticated /api/instagram-scraper and /api/tiktok routes by hitting
// RapidAPI directly with the same RAPIDAPI_KEY env var.
//
// All errors are caught and surfaced as `null` so a transient API failure
// never breaks the portal — the stale snapshot remains visible.

const IG_HOST = "instagram-public-bulk-scraper.p.rapidapi.com";
const TT_HOST = "tiktok-trend-analysis-api.p.rapidapi.com";

export type IgSnapshot = {
  ig_followers: number;
  ig_following: number;
  ig_posts: number;
  ig_engagement: number;
  ig_bio: string;
  ig_avatar: string;
  ig_verified: boolean;
  posts: Array<{
    s: string; // shortcode
    l: number; // likes
    c: number; // comments
    v: number; // is video (0/1)
    vv: number; // video views
    t: number; // timestamp
    th: string; // thumbnail
  }>;
};

export type TtSnapshot = {
  tt_followers: number;
  tt_likes: number;
  tt_videos: number;
};

export async function fetchIgSnapshot(username: string): Promise<IgSnapshot | null> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey || !username) return null;

  try {
    const res = await fetch(
      `https://${IG_HOST}/v1/user_info_web?username=${encodeURIComponent(username)}`,
      {
        headers: {
          "x-rapidapi-host": IG_HOST,
          "x-rapidapi-key": apiKey,
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) return null;

    const json = await res.json();
    const u = json?.data?.user || json?.data || json?.user || json;
    if (!u || (!u.username && !u.full_name)) return null;

    const followers: number = u.follower_count || u.edge_followed_by?.count || 0;
    const following: number = u.following_count || u.edge_follow?.count || 0;
    const postsCount: number = u.media_count || u.edge_owner_to_timeline_media?.count || 0;

    const recentEdges: any[] = u.edge_owner_to_timeline_media?.edges || [];
    let engagement = 0;
    if (recentEdges.length > 0 && followers > 0) {
      const total = recentEdges.reduce((sum, edge) => {
        const node = edge.node || edge;
        const likes = node.edge_liked_by?.count || node.like_count || 0;
        const comments = node.edge_media_to_comment?.count || node.comment_count || 0;
        return sum + likes + comments;
      }, 0);
      engagement = Number(((total / recentEdges.length / followers) * 100).toFixed(2));
    }

    const posts = recentEdges.slice(0, 6).map((edge) => {
      const node = edge.node || edge;
      return {
        s: node.shortcode || "",
        l: node.edge_liked_by?.count || node.like_count || 0,
        c: node.edge_media_to_comment?.count || node.comment_count || 0,
        v: node.is_video ? 1 : 0,
        vv: node.video_view_count || 0,
        t: node.taken_at_timestamp || node.taken_at || 0,
        th: node.thumbnail_src || node.display_url || node.thumbnail_url || "",
      };
    });

    return {
      ig_followers: followers,
      ig_following: following,
      ig_posts: postsCount,
      ig_engagement: engagement,
      ig_bio: (u.biography || "").substring(0, 240),
      ig_avatar: u.profile_pic_url || u.profile_pic_url_hd || "",
      ig_verified: !!u.is_verified,
      posts,
    };
  } catch {
    return null;
  }
}

export async function fetchTtSnapshot(username: string): Promise<TtSnapshot | null> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey || !username) return null;

  try {
    const res = await fetch(
      `https://${TT_HOST}/api/search?query=${encodeURIComponent(username)}&count=5`,
      {
        headers: {
          "x-rapidapi-host": TT_HOST,
          "x-rapidapi-key": apiKey,
        },
      }
    );
    if (!res.ok) return null;

    const json = await res.json();
    if (!json.success) return null;

    const users = (json.data?.users || []) as any[];
    const match =
      users.find((u) => (u.uniqueId || u.username || "").toLowerCase() === username.toLowerCase()) ||
      users[0];

    if (!match) return null;

    return {
      tt_followers: match.followerCount || match.fans || 0,
      tt_likes: match.heartCount || match.heart || 0,
      tt_videos: match.videoCount || 0,
    };
  } catch {
    return null;
  }
}

// Refresh cooldown — don't hammer RapidAPI on every portal view.
// 30 minutes feels live enough for an analytics report and keeps cost down.
export const REFRESH_COOLDOWN_MS = 30 * 60 * 1000;

export function isStale(lastRefreshedAt: number | undefined): boolean {
  if (!lastRefreshedAt || typeof lastRefreshedAt !== "number") return true;
  return Date.now() - lastRefreshedAt > REFRESH_COOLDOWN_MS;
}
