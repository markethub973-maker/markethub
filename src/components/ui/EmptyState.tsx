"use client";

import GlassButton from "./GlassButton";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
  onCta: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[320px] gap-6">
      <div
        className="liquidGlass-wrapper"
        style={{ borderRadius: "50%", width: 72, height: 72 }}
      >
        <div className="liquidGlass-effect" />
        <div className="liquidGlass-tint glass-accent" />
        <div className="liquidGlass-shine" />
        <div className="liquidGlass-content w-full h-full flex items-center justify-center text-3xl">
          {icon}
        </div>
      </div>
      <div className="text-center max-w-sm">
        <h3 className="text-glass-primary font-semibold text-lg mb-2">{title}</h3>
        <p className="text-glass-muted text-sm leading-relaxed">{description}</p>
      </div>
      <div className="flex gap-3">
        <GlassButton variant="primary" onClick={onCta}>
          {ctaLabel}
        </GlassButton>
        {secondaryLabel && onSecondary && (
          <GlassButton variant="secondary" onClick={onSecondary}>
            {secondaryLabel}
          </GlassButton>
        )}
      </div>
    </div>
  );
}
