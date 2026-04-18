"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";

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

// Dark public pages where glass effect looks good
const GLASS_PATHS = ["/demo", "/promo", "/pricing", "/features", "/white-label", "/for/"];

/**
 * Smart card component:
 * - On dark public pages → full Liquid Glass (4 layers)
 * - On dashboard → clean solid card (readable, no artifacts)
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
  const pathname = usePathname();
  const useGlass = GLASS_PATHS.some((p) => pathname?.startsWith(p));

  if (useGlass) {
    // Full Liquid Glass on dark public pages
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

  // Clean solid card on dashboard
  return (
    <Tag
      className={`${rounded} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        background: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        color: "rgba(255, 255, 255, 0.92)",
        ...style,
      }}
    >
      <div className={padding}>{children}</div>
    </Tag>
  );
}
