"use client";

import { type ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  accent?: boolean;
  padding?: string;
  rounded?: string;
  onClick?: () => void;
  as?: "div" | "section" | "article";
  style?: React.CSSProperties;
}

/**
 * 4-layer Liquid Glass card component.
 *
 * Layers:
 *   1. wrapper (isolation context + border-radius clip)
 *   2. effect (backdrop-filter blur + SVG distortion)
 *   3. tint (semi-transparent background + border)
 *   4. shine (top specular highlight)
 *   5. content (children)
 *
 * Set accent={true} for accent-tinted glass (uses --accent CSS var).
 */
export default function GlassCard({
  children,
  className = "",
  accent = false,
  padding = "p-4",
  rounded = "rounded-2xl",
  onClick,
  as: Tag = "div",
  style,
}: GlassCardProps) {
  return (
    <Tag
      className={`liquidGlass-wrapper ${accent ? "glass-accent" : ""} ${rounded} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={style}
    >
      <div className="liquidGlass-effect" />
      <div className="liquidGlass-tint" />
      <div className="liquidGlass-shine" />
      <div className={`liquidGlass-content ${padding}`}>{children}</div>
    </Tag>
  );
}
