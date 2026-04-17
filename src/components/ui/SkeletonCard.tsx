"use client";

import GlassCard from "./GlassCard";

interface SkeletonCardProps {
  lines?: number;
  height?: string;
}

export default function SkeletonCard({ lines = 3, height = "h-32" }: SkeletonCardProps) {
  return (
    <GlassCard>
      <div className={`${height} flex flex-col gap-3 justify-center`}>
        <div className="glass-shimmer h-4 w-3/4 rounded" />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <div
            key={i}
            className="glass-shimmer h-3 rounded"
            style={{ width: `${60 + Math.random() * 30}%` }}
          />
        ))}
      </div>
    </GlassCard>
  );
}
