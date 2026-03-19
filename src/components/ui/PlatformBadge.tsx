import { cn } from "@/lib/utils";
import type { Platform } from "@/lib/mockData";

const config: Record<Platform, { label: string; color: string; bg: string }> = {
  youtube: { label: "YouTube", color: "text-red-600", bg: "bg-red-50" },
  tiktok: { label: "TikTok", color: "text-cyan-600", bg: "bg-cyan-50" },
  instagram: { label: "Instagram", color: "text-pink-600", bg: "bg-pink-50" },
  facebook: { label: "Facebook", color: "text-blue-600", bg: "bg-blue-50" },
};

const icons: Record<Platform, string> = {
  youtube: "▶",
  tiktok: "♪",
  instagram: "◈",
  facebook: "f",
};

export default function PlatformBadge({ platform }: { platform: Platform }) {
  const { label, color, bg } = config[platform];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", bg, color)}>
      <span>{icons[platform]}</span>
      {label}
    </span>
  );
}
