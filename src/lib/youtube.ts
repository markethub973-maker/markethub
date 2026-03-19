const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE = "https://www.googleapis.com/youtube/v3";

export interface YTVideo {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string;
  duration?: string;
}

export interface YTChannel {
  id: string;
  name: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  thumbnail: string;
  description: string;
}

export async function getTrendingVideos(regionCode = "US", maxResults = 12): Promise<YTVideo[]> {
  const res = await fetch(
    `${BASE}/videos?part=snippet,statistics&chart=mostPopular&maxResults=${maxResults}&regionCode=${regionCode}&key=${API_KEY}`,
    { next: { revalidate: 3600 } }
  );
  const data = await res.json();
  if (!data.items) return [];

  return data.items.map((item: any) => ({
    id: item.id,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || "",
    views: parseInt(item.statistics?.viewCount || "0"),
    likes: parseInt(item.statistics?.likeCount || "0"),
    comments: parseInt(item.statistics?.commentCount || "0"),
    publishedAt: item.snippet.publishedAt,
  }));
}

export async function searchVideos(query: string, maxResults = 12): Promise<YTVideo[]> {
  const searchRes = await fetch(
    `${BASE}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&order=viewCount&key=${API_KEY}`,
    { next: { revalidate: 1800 } }
  );
  const searchData = await searchRes.json();
  if (!searchData.items?.length) return [];

  const ids = searchData.items.map((i: any) => i.id.videoId).join(",");
  const statsRes = await fetch(
    `${BASE}/videos?part=statistics,snippet&id=${ids}&key=${API_KEY}`,
    { next: { revalidate: 1800 } }
  );
  const statsData = await statsRes.json();
  if (!statsData.items) return [];

  return statsData.items.map((item: any) => ({
    id: item.id,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    thumbnail: item.snippet.thumbnails?.high?.url || "",
    views: parseInt(item.statistics?.viewCount || "0"),
    likes: parseInt(item.statistics?.likeCount || "0"),
    comments: parseInt(item.statistics?.commentCount || "0"),
    publishedAt: item.snippet.publishedAt,
  }));
}

export async function getChannelStats(channelId: string): Promise<YTChannel | null> {
  const res = await fetch(
    `${BASE}/channels?part=snippet,statistics&id=${channelId}&key=${API_KEY}`,
    { next: { revalidate: 3600 } }
  );
  const data = await res.json();
  if (!data.items?.[0]) return null;
  const ch = data.items[0];

  return {
    id: ch.id,
    name: ch.snippet.title,
    subscribers: parseInt(ch.statistics?.subscriberCount || "0"),
    totalViews: parseInt(ch.statistics?.viewCount || "0"),
    videoCount: parseInt(ch.statistics?.videoCount || "0"),
    thumbnail: ch.snippet.thumbnails?.high?.url || "",
    description: ch.snippet.description || "",
  };
}

export async function getTopChannels(): Promise<YTChannel[]> {
  const topChannelIds = [
    "UCX6OQ3DkcsbYNE6H8uQQuVA", // MrBeast
    "UCBJycsmduvYEL83R_U4JriQ", // MKBHD
    "UCVHFbw7woebKtfvug_tPq0Q", // Linus Tech Tips
    "UC-lHJZR3Gqxm24_Vd_AJ5Yw", // PewDiePie
    "UCnUYZLuoy1rq1aVMwx4aTzw", // Gordon Ramsay
    "UCq-Fj5jknLsUf-MWSy4_brA", // T-Series
  ];
  const results = await Promise.allSettled(topChannelIds.map(getChannelStats));
  return results
    .filter((r): r is PromiseFulfilledResult<YTChannel> => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value);
}
