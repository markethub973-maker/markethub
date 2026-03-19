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

// ─── Platform Stats ──────────────────────────────────────────────────────────

export const platformStats: PlatformStats[] = [
  {
    platform: "youtube",
    totalViews: 4_820_000_000,
    totalEngagement: 342_000_000,
    avgEngagementRate: 7.1,
    topVideos: 15420,
    growthPercent: 12.4,
  },
  {
    platform: "tiktok",
    totalViews: 8_310_000_000,
    totalEngagement: 1_240_000_000,
    avgEngagementRate: 14.9,
    topVideos: 28750,
    growthPercent: 34.7,
  },
  {
    platform: "instagram",
    totalViews: 2_150_000_000,
    totalEngagement: 310_000_000,
    avgEngagementRate: 14.4,
    topVideos: 9830,
    growthPercent: 8.2,
  },
  {
    platform: "facebook",
    totalViews: 1_980_000_000,
    totalEngagement: 118_000_000,
    avgEngagementRate: 6.0,
    topVideos: 7210,
    growthPercent: -2.1,
  },
];

// ─── Daily Stats for Charts ──────────────────────────────────────────────────

export const dailyStats: DailyStats[] = [
  { date: "Mar 1", youtube: 320, tiktok: 580, instagram: 210, facebook: 180 },
  { date: "Mar 3", youtube: 345, tiktok: 620, instagram: 225, facebook: 165 },
  { date: "Mar 5", youtube: 310, tiktok: 710, instagram: 240, facebook: 172 },
  { date: "Mar 7", youtube: 380, tiktok: 695, instagram: 218, facebook: 190 },
  { date: "Mar 9", youtube: 420, tiktok: 780, instagram: 260, facebook: 185 },
  { date: "Mar 11", youtube: 395, tiktok: 830, instagram: 275, facebook: 178 },
  { date: "Mar 13", youtube: 450, tiktok: 920, instagram: 295, facebook: 195 },
  { date: "Mar 15", youtube: 480, tiktok: 1050, instagram: 310, facebook: 200 },
  { date: "Mar 17", youtube: 465, tiktok: 980, instagram: 305, facebook: 188 },
  { date: "Mar 19", youtube: 510, tiktok: 1120, instagram: 340, facebook: 210 },
];

export const engagementData = [
  { date: "Mar 1", rate: 8.2 },
  { date: "Mar 3", rate: 9.1 },
  { date: "Mar 5", rate: 8.7 },
  { date: "Mar 7", rate: 10.4 },
  { date: "Mar 9", rate: 11.2 },
  { date: "Mar 11", rate: 10.8 },
  { date: "Mar 13", rate: 12.1 },
  { date: "Mar 15", rate: 13.5 },
  { date: "Mar 17", rate: 12.9 },
  { date: "Mar 19", rate: 14.2 },
];

// ─── Top Videos ──────────────────────────────────────────────────────────────

export const topVideos: Video[] = [
  {
    id: "v1",
    title: "I Survived 100 Days in Minecraft Hardcore",
    platform: "youtube",
    channel: "DreamXD",
    channelAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=DreamXD",
    thumbnail: "https://picsum.photos/seed/v1/320/180",
    views: 48_200_000,
    likes: 3_100_000,
    comments: 284_000,
    shares: 620_000,
    engagementRate: 8.3,
    publishedAt: "2026-03-10",
    duration: "47:22",
    trending: true,
    growthPercent: 28.4,
  },
  {
    id: "v2",
    title: "POV: You have 10 seconds to impress me 🔥",
    platform: "tiktok",
    channel: "@charlidamelio",
    channelAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=charli",
    thumbnail: "https://picsum.photos/seed/v2/320/180",
    views: 124_000_000,
    likes: 18_400_000,
    comments: 920_000,
    shares: 4_200_000,
    engagementRate: 18.9,
    publishedAt: "2026-03-15",
    duration: "0:15",
    trending: true,
    growthPercent: 67.2,
  },
  {
    id: "v3",
    title: "Morning routine that changed my life ✨",
    platform: "instagram",
    channel: "@thegoodminimalist",
    channelAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=minima",
    thumbnail: "https://picsum.photos/seed/v3/320/180",
    views: 12_400_000,
    likes: 1_840_000,
    comments: 43_000,
    shares: 380_000,
    engagementRate: 17.9,
    publishedAt: "2026-03-12",
    duration: "0:58",
    trending: true,
    growthPercent: 41.5,
  },
  {
    id: "v4",
    title: "World Record: Eating the spiciest ramen in Japan",
    platform: "facebook",
    channel: "Tasty World",
    channelAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=TastyW",
    thumbnail: "https://picsum.photos/seed/v4/320/180",
    views: 29_800_000,
    likes: 1_450_000,
    comments: 312_000,
    shares: 890_000,
    engagementRate: 8.9,
    publishedAt: "2026-03-08",
    duration: "8:43",
    trending: false,
    growthPercent: 12.1,
  },
  {
    id: "v5",
    title: "How AI Will Change Everything in 2026",
    platform: "youtube",
    channel: "MKBHD",
    channelAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=MKBHD",
    thumbnail: "https://picsum.photos/seed/v5/320/180",
    views: 22_100_000,
    likes: 1_280_000,
    comments: 97_000,
    shares: 215_000,
    engagementRate: 7.2,
    publishedAt: "2026-03-05",
    duration: "18:07",
    trending: true,
    growthPercent: 19.8,
  },
  {
    id: "v6",
    title: "I built a $50 PC that runs Cyberpunk 2077",
    platform: "youtube",
    channel: "Linus Tech Tips",
    channelAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=Linus",
    thumbnail: "https://picsum.photos/seed/v6/320/180",
    views: 18_700_000,
    likes: 980_000,
    comments: 74_000,
    shares: 145_000,
    engagementRate: 6.4,
    publishedAt: "2026-03-14",
    duration: "22:51",
    trending: false,
    growthPercent: 8.7,
  },
  {
    id: "v7",
    title: "Gym transformation: 90 days no sugar challenge",
    platform: "tiktok",
    channel: "@fitnessguru",
    channelAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=fitness",
    thumbnail: "https://picsum.photos/seed/v7/320/180",
    views: 87_500_000,
    likes: 12_300_000,
    comments: 540_000,
    shares: 3_100_000,
    engagementRate: 18.2,
    publishedAt: "2026-03-17",
    duration: "0:30",
    trending: true,
    growthPercent: 52.3,
  },
  {
    id: "v8",
    title: "Luxury Bali resort that costs $20 a night 🌴",
    platform: "instagram",
    channel: "@wanderlust.asia",
    channelAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=wanderlust",
    thumbnail: "https://picsum.photos/seed/v8/320/180",
    views: 8_900_000,
    likes: 1_240_000,
    comments: 28_000,
    shares: 195_000,
    engagementRate: 16.4,
    publishedAt: "2026-03-16",
    duration: "1:02",
    trending: false,
    growthPercent: 23.7,
  },
];

// ─── Top Channels ─────────────────────────────────────────────────────────────

export const topChannels: Channel[] = [
  {
    id: "c1",
    name: "MrBeast",
    platform: "youtube",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=MrBeast",
    subscribers: 310_000_000,
    totalViews: 48_000_000_000,
    videoCount: 890,
    avgViews: 54_000_000,
    engagementRate: 8.7,
    growthPercent: 4.2,
    category: "Entertainment",
  },
  {
    id: "c2",
    name: "@khaby.lame",
    platform: "tiktok",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Khaby",
    subscribers: 162_000_000,
    totalViews: 2_800_000_000,
    videoCount: 1240,
    avgViews: 22_000_000,
    engagementRate: 12.4,
    growthPercent: 1.8,
    category: "Comedy",
  },
  {
    id: "c3",
    name: "@cristiano",
    platform: "instagram",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Cristiano",
    subscribers: 640_000_000,
    totalViews: 4_200_000_000,
    videoCount: 3800,
    avgViews: 11_000_000,
    engagementRate: 3.8,
    growthPercent: 2.1,
    category: "Sports",
  },
  {
    id: "c4",
    name: "MKBHD",
    platform: "youtube",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=MKBHD2",
    subscribers: 18_400_000,
    totalViews: 4_100_000_000,
    videoCount: 1680,
    avgViews: 2_400_000,
    engagementRate: 6.9,
    growthPercent: 7.3,
    category: "Technology",
  },
  {
    id: "c5",
    name: "@charlidamelio",
    platform: "tiktok",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Charli2",
    subscribers: 155_000_000,
    totalViews: 11_000_000_000,
    videoCount: 2100,
    avgViews: 52_000_000,
    engagementRate: 15.2,
    growthPercent: 0.9,
    category: "Dance",
  },
  {
    id: "c6",
    name: "Tasty",
    platform: "facebook",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Tasty2",
    subscribers: 108_000_000,
    totalViews: 32_000_000_000,
    videoCount: 7400,
    avgViews: 4_300_000,
    engagementRate: 5.1,
    growthPercent: -1.4,
    category: "Food",
  },
];

// ─── Trending Topics ──────────────────────────────────────────────────────────

export const trendingTopics: TrendingTopic[] = [
  { id: "t1", keyword: "#AIchallenge", platform: "tiktok", videoCount: 284000, totalViews: 18_400_000_000, growthPercent: 124.5, category: "Technology" },
  { id: "t2", keyword: "vlog daily life", platform: "youtube", videoCount: 142000, totalViews: 6_200_000_000, growthPercent: 34.2, category: "Lifestyle" },
  { id: "t3", keyword: "#gymtok", platform: "tiktok", videoCount: 412000, totalViews: 28_000_000_000, growthPercent: 67.8, category: "Fitness" },
  { id: "t4", keyword: "travel reels 2026", platform: "instagram", videoCount: 89000, totalViews: 3_400_000_000, growthPercent: 28.4, category: "Travel" },
  { id: "t5", keyword: "cooking at home", platform: "facebook", videoCount: 76000, totalViews: 2_100_000_000, growthPercent: -4.2, category: "Food" },
  { id: "t6", keyword: "#booktok", platform: "tiktok", videoCount: 198000, totalViews: 9_800_000_000, growthPercent: 89.3, category: "Education" },
  { id: "t7", keyword: "tech review 2026", platform: "youtube", videoCount: 67000, totalViews: 4_300_000_000, growthPercent: 22.1, category: "Technology" },
  { id: "t8", keyword: "#outfitcheck", platform: "instagram", videoCount: 340000, totalViews: 14_200_000_000, growthPercent: 45.6, category: "Fashion" },
];

// ─── Competitors ──────────────────────────────────────────────────────────────

export const competitors = [
  { name: "Tubular Labs", marketShare: 28, pricing: "$2500/mo", features: ["YouTube", "Facebook"], strength: "Enterprise" },
  { name: "Socialbakers", marketShare: 19, pricing: "$200/mo", features: ["Instagram", "Facebook"], strength: "SMB" },
  { name: "Brandwatch", marketShare: 16, pricing: "$1000/mo", features: ["All platforms"], strength: "Analytics" },
  { name: "ViralStat", marketShare: 14, pricing: "$49/mo", features: ["All platforms", "TikTok"], strength: "Value" },
  { name: "Sprout Social", marketShare: 23, pricing: "$249/mo", features: ["Instagram", "YouTube"], strength: "Management" },
];

export const competitorGrowth = [
  { month: "Oct", tubular: 24, socialbakers: 20, brandwatch: 17, viralstat: 10 },
  { month: "Nov", tubular: 25, socialbakers: 20, brandwatch: 16, viralstat: 11 },
  { month: "Dec", tubular: 26, socialbakers: 19, brandwatch: 16, viralstat: 12 },
  { month: "Jan", tubular: 27, socialbakers: 19, brandwatch: 16, viralstat: 13 },
  { month: "Feb", tubular: 27, socialbakers: 19, brandwatch: 16, viralstat: 13 },
  { month: "Mar", tubular: 28, socialbakers: 19, brandwatch: 16, viralstat: 14 },
];

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
