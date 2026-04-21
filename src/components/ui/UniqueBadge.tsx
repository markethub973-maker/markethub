"use client";

import { useState } from "react";

interface UniqueBadgeProps {
  className?: string;
}

export function UniqueBadge({ className }: UniqueBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span
      className={`relative inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ""}`}
      style={{ backgroundColor: "rgba(22, 163, 74, 0.1)", color: "#16A34A" }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Lock icon */}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      100% unique
      {showTooltip && (
        <span
          className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg"
          role="tooltip"
        >
          Not used by any other MarketHub user in the last 30 days.
        </span>
      )}
    </span>
  );
}

export default UniqueBadge;
