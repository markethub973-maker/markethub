"use client";

import { type ReactNode, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "btn-liquid-primary",
  secondary: "btn-liquid-secondary",
  danger: "btn-liquid-danger",
  ghost: "btn-liquid-ghost",
};

const SIZE_CLASS: Record<string, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function GlassButton({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: GlassButtonProps) {
  return (
    <button
      className={`${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
