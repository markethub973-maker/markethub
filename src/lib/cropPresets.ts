/**
 * Crop presets for visual_crops.target_format.
 * Target dimensions + human labels for the Studio UI.
 */

export type CropFormat =
  | "square"
  | "post"
  | "story"
  | "reel"
  | "cover"
  | "thumbnail"
  | "landscape"
  | "portrait"
  | "linkedin"
  | "twitter";

export interface CropPreset {
  format: CropFormat;
  label: string;
  width: number;
  height: number;
  aspect: string;
  usedFor: string;
  icon: string;
}

export const CROP_PRESETS: CropPreset[] = [
  { format: "square",    label: "Instagram Feed",       width: 1080, height: 1080, aspect: "1:1",   usedFor: "IG post, FB post",          icon: "⬛" },
  { format: "post",      label: "Instagram Tall",       width: 1080, height: 1350, aspect: "4:5",   usedFor: "IG tall feed (best engagement)", icon: "📸" },
  { format: "story",     label: "Story",                width: 1080, height: 1920, aspect: "9:16",  usedFor: "IG/FB stories",             icon: "📱" },
  { format: "reel",      label: "Reel / TikTok",        width: 1080, height: 1920, aspect: "9:16",  usedFor: "IG Reels, TikTok, Shorts",  icon: "🎬" },
  { format: "cover",     label: "Link Preview Cover",   width: 1200, height: 630,  aspect: "1.9:1", usedFor: "FB/LI/Twitter link preview",icon: "🔗" },
  { format: "thumbnail", label: "YouTube Thumbnail",    width: 1280, height: 720,  aspect: "16:9",  usedFor: "YouTube video thumb",       icon: "▶️" },
  { format: "landscape", label: "Landscape HD",         width: 1920, height: 1080, aspect: "16:9",  usedFor: "YouTube, blog header",      icon: "🖼️" },
  { format: "portrait",  label: "Pinterest",            width: 1000, height: 1500, aspect: "2:3",   usedFor: "Pinterest pin",             icon: "📌" },
  { format: "linkedin",  label: "LinkedIn Feed",        width: 1200, height: 627,  aspect: "1.9:1", usedFor: "LinkedIn post",             icon: "💼" },
  { format: "twitter",   label: "Twitter Feed",         width: 1200, height: 675,  aspect: "16:9",  usedFor: "Twitter/X post",            icon: "🐦" },
];

export function getPreset(format: string): CropPreset | null {
  return CROP_PRESETS.find((p) => p.format === format) ?? null;
}
