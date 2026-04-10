/**
 * Platform publishers — shared between /api/calendar/publish (manual) and
 * /api/cron/auto-post (scheduled). Each function takes the scheduled_posts
 * row and whatever credentials it needs, returns a uniform result.
 */

export interface ScheduledPostRow {
  id: string;
  user_id: string;
  title: string;
  caption: string | null;
  platform: string;
  status: string;
  date: string;
  time: string;
  image_url: string | null;
  client: string | null;
  hashtags: string | null;
  first_comment: string | null;
}

export interface PublishResult {
  ok: boolean;
  external_id?: string;
  error?: string;
}

// Build the final post text from caption + hashtags. first_comment is
// posted separately on platforms that support comments (Instagram).
export function buildPostText(post: Pick<ScheduledPostRow, "caption" | "hashtags">): string {
  const parts: string[] = [];
  if (post.caption) parts.push(post.caption);
  if (post.hashtags) parts.push(post.hashtags.startsWith("#") ? post.hashtags : post.hashtags.split(",").map(t => t.trim()).filter(Boolean).map(t => t.startsWith("#") ? t : `#${t}`).join(" "));
  return parts.join("\n\n");
}

// Treat image_url as media only if it looks like a real image. Users sometimes
// paste a website URL (e.g., the app homepage) into the image field — those
// would break posting on IG/LinkedIn with a cryptic "invalid media" error.
export function isUsableImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (!/^https?:\/\//i.test(url)) return false;
  // Accept common image extensions and common image hosts
  if (/\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url)) return true;
  if (/(cloudinary|imgur|unsplash|pexels|pixabay|supabase\.co\/storage|cdninstagram|fbcdn)/i.test(url)) return true;
  return false;
}

// ── LinkedIn ───────────────────────────────────────────────────────────────
export async function publishToLinkedIn(
  post: ScheduledPostRow,
  linkedinToken: string
): Promise<PublishResult> {
  if (!linkedinToken) return { ok: false, error: "LinkedIn not connected. Go to Settings → Integrations." };

  const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${linkedinToken}` },
  });
  if (!meRes.ok) return { ok: false, error: "LinkedIn token invalid or expired. Reconnect." };
  const me = await meRes.json();
  const authorUrn = `urn:li:person:${me.sub}`;

  const text = buildPostText(post);
  const includeMedia = isUsableImageUrl(post.image_url);

  interface LinkedInShareContent {
    shareCommentary: { text: string };
    shareMediaCategory: "NONE" | "IMAGE";
    media?: Array<{
      status: string;
      description: { text: string };
      originalUrl: string;
      title: { text: string };
    }>;
  }

  const shareContent: LinkedInShareContent = {
    shareCommentary: { text },
    shareMediaCategory: includeMedia ? "IMAGE" : "NONE",
  };

  if (includeMedia && post.image_url) {
    shareContent.media = [{
      status: "READY",
      description: { text: text.slice(0, 200) },
      originalUrl: post.image_url,
      title: { text: post.title || "" },
    }];
  }

  const ugcPost = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const liRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${linkedinToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(ugcPost),
  });
  const liData = await liRes.json();
  if (liRes.ok) return { ok: true, external_id: liData.id };
  return { ok: false, error: liData.message ?? `LinkedIn publish failed (HTTP ${liRes.status})` };
}

// ── Facebook Page ──────────────────────────────────────────────────────────
export async function publishToFacebook(
  post: ScheduledPostRow,
  fbPageId: string | null,
  fbPageAccessToken: string | null
): Promise<PublishResult> {
  if (!fbPageId || !fbPageAccessToken) {
    return { ok: false, error: "Facebook Page not connected. Go to Settings → Integrations." };
  }

  const text = buildPostText(post);
  const includeMedia = isUsableImageUrl(post.image_url);

  // Different endpoint depending on whether there is a photo
  const endpoint = includeMedia ? `${fbPageId}/photos` : `${fbPageId}/feed`;
  const body: Record<string, string> = {
    access_token: fbPageAccessToken,
  };
  if (includeMedia && post.image_url) {
    body.url = post.image_url;
    body.caption = text;
  } else {
    body.message = text;
  }

  const fbRes = await fetch(`https://graph.facebook.com/v22.0/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const fbData = await fbRes.json();
  if (fbData.id || fbData.post_id) {
    return { ok: true, external_id: fbData.id || fbData.post_id };
  }
  return { ok: false, error: fbData.error?.message ?? "Facebook publish failed" };
}

// ── Instagram ──────────────────────────────────────────────────────────────
export async function publishToInstagram(
  post: ScheduledPostRow,
  igUserId: string | null,
  igAccessToken: string | null
): Promise<PublishResult> {
  if (!igUserId || !igAccessToken) {
    return { ok: false, error: "Instagram not connected. Go to Settings → Integrations." };
  }
  if (!isUsableImageUrl(post.image_url)) {
    return { ok: false, error: "Instagram requires a valid image URL (jpg/png/webp)." };
  }

  const text = buildPostText(post);

  // Step 1: create media container
  const createRes = await fetch(
    `https://graph.facebook.com/v22.0/${igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: post.image_url,
        caption: text,
        access_token: igAccessToken,
      }),
    }
  );
  const createData = await createRes.json();
  if (!createData.id) {
    return { ok: false, error: createData.error?.message || "Failed to create IG media container" };
  }

  // Poll until ready (up to ~10s) — IG can take a moment to fetch the image
  await new Promise(r => setTimeout(r, 2000));

  // Step 2: publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v22.0/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token: igAccessToken,
      }),
    }
  );
  const publishData = await publishRes.json();
  if (!publishData.id) {
    return { ok: false, error: publishData.error?.message || "Failed to publish IG media" };
  }
  return { ok: true, external_id: publishData.id };
}
