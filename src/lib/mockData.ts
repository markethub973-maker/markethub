export type Platform = "youtube" | "tiktok" | "instagram" | "facebook";

export interface Video {
  id: string;
  title: string;
  platform: Platform;
  channel: string;
  channelAvatar: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  publishedAt: string;
  duration: string;
  trending: boolean;
  growthPercent: number;
}

export interface Channel {
  id: string;
  name: string;
  platform: Platform;
  avatar: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  avgViews: number;
  engagementRate: number;
  growthPercent: number;
  category: string;
}

export interface TrendingTopic {
  id: string;
  keyword: string;
  platform: Platform;
  videoCount: number;
  totalViews: number;
  growthPercent: number;
  category: string;
}

export interface DailyStats {
  date: string;
  youtube: number;
  tiktok: number;
  instagram: number;
  facebook: number;
}

export interface PlatformStats {
  platform: Platform;
  totalViews: number;
  totalEngagement: number;
  avgEngagementRate: number;
  topVideos: number;
  growthPercent: number;
}

export const platformColors: Record<Platform, string> = {
  youtube: "#FF0000",
  tiktok: "#00f2ea",
  instagram: "#E1306C",
  facebook: "#1877F2",
};

export const platformBgColors: Record<Platform, string> = {
  youtube: "#FFF0F0",
  tiktok: "#F0FFFE",
  instagram: "#FFF0F5",
  facebook: "#F0F4FF",
};
