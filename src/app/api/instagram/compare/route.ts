import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptField } from "@/lib/fieldCrypto";

async function fetchIGProfile(igId: string, token: string) {
  const res = await fetch(
    `https://graph.facebook.com/v22.0/${igId}?fields=id,name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website&access_token=${token}`,
    { signal: AbortSignal.timeout(10000) }
  );
  return res.ok ? res.json() : null;
}

async function fetchIGMedia(igId: string, token: string) {
  const res = await fetch(
    `https://graph.facebook.com/v22.0/${igId}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,permalink&limit=20&access_token=${token}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: connections } = await supabase
    .from("instagram_connections")
    .select("id, instagram_id, instagram_username, instagram_name, account_label, is_primary, access_token, enc_access_token")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false });

  if (!connections?.length) {
    return NextResponse.json({ accounts: [] });
  }

  const results = await Promise.all(
    connections.map(async (conn) => {
      // Resolve token
      let token = conn.access_token as string;
      const enc = conn.enc_access_token as string | undefined;
      if (enc?.startsWith("enc:v1:")) {
        try { const dec = decryptField(enc); if (dec) token = dec; } catch {}
      }

      const [profile, media] = await Promise.all([
        fetchIGProfile(conn.instagram_id, token),
        fetchIGMedia(conn.instagram_id, token),
      ]);

      // Compute engagement rate from recent posts
      const totalEngagement = media.reduce(
        (s: number, p: any) => s + (p.like_count || 0) + (p.comments_count || 0), 0
      );
      const avgEngagement = media.length > 0 ? totalEngagement / media.length : 0;
      const engagementRate = profile?.followers_count > 0
        ? ((avgEngagement / profile.followers_count) * 100).toFixed(2)
        : "0.00";

      const topPost = media.length > 0
        ? media.reduce((best: any, p: any) =>
            (p.like_count + p.comments_count) > (best.like_count + best.comments_count) ? p : best
          )
        : null;

      return {
        id: conn.id,
        instagram_id: conn.instagram_id,
        username: conn.instagram_username,
        name: conn.instagram_name,
        label: conn.account_label || conn.instagram_name,
        is_primary: conn.is_primary,
        profile: profile?.error ? null : profile,
        engagement_rate: engagementRate,
        avg_likes: media.length > 0
          ? Math.round(media.reduce((s: number, p: any) => s + (p.like_count || 0), 0) / media.length)
          : 0,
        avg_comments: media.length > 0
          ? Math.round(media.reduce((s: number, p: any) => s + (p.comments_count || 0), 0) / media.length)
          : 0,
        top_post: topPost,
        recent_posts_count: media.length,
        error: profile?.error?.message || (profile ? null : "Could not fetch data"),
      };
    })
  );

  return NextResponse.json({ accounts: results });
}
