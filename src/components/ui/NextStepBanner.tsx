"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

const STEP_MAP: Record<string, { text: string; href: string }> = {
  "/dashboard/overview": {
    text: "Start by connecting your social accounts",
    href: "/social-accounts",
  },
  "/social-accounts": {
    text: "Now discover competitors and trends",
    href: "/competitors",
  },
  "/competitors": {
    text: "Plan your content calendar",
    href: "/calendar",
  },
  "/calendar": {
    text: "Create content with AI Studio",
    href: "/studio/image",
  },
  "/studio/image": {
    text: "Schedule and publish your posts",
    href: "/studio/queue",
  },
  "/studio/queue": {
    text: "Track your analytics",
    href: "/",
  },
  "/": {
    text: "Generate your performance report",
    href: "/monthly-report",
  },
  "/monthly-report": {
    text: "Share reports with your clients",
    href: "/clients",
  },
};

interface NextStepBannerProps {
  currentPage: string;
}

export default function NextStepBanner({ currentPage }: NextStepBannerProps) {
  const step = STEP_MAP[currentPage];
  if (!step) return null;

  return (
    <Link
      href={step.href}
      className="block w-full rounded-xl px-4 py-3 md:px-6 md:py-3.5 transition-all hover:opacity-90"
      style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(236,128,84,0.15) 100%)",
        border: "1px solid rgba(245,158,11,0.25)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="text-xs font-bold uppercase tracking-wider shrink-0"
          style={{ color: "var(--color-primary, #F59E0B)" }}
        >
          Next step
        </span>
        <span
          className="text-sm flex-1 truncate"
          style={{ color: "var(--color-text, #2D2620)" }}
        >
          {step.text}
        </span>
        <ArrowRight
          className="w-4 h-4 shrink-0"
          style={{ color: "var(--color-primary, #F59E0B)" }}
        />
      </div>
    </Link>
  );
}
