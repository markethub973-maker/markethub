"use client";

/**
 * Password strength meter — lightweight, no external lib.
 *
 * Scoring (0-4):
 *  0: too short or common
 *  1: meets length but low variety
 *  2: length + mixed case
 *  3: length + mixed case + digits
 *  4: length ≥ 12, mixed case, digits, symbols
 *
 * Visual: 4 segments, animates from red → yellow → green as score climbs.
 * Also shows a plain-language label + hint for the next improvement.
 *
 * Intentionally NOT using zxcvbn (~150 KB gzipped) — overkill for a
 * signup form. This heuristic catches the bottom 95% of bad passwords
 * and the register endpoint does its own server-side checks too.
 */

import { useMemo } from "react";

interface Props {
  password: string;
  showHint?: boolean;
}

// Tiny curated list — catches most obvious garbage. Not a replacement
// for a real breach check, but rejects "password", "12345678" etc.
const COMMON = new Set([
  "password", "password1", "password123", "12345678", "123456789",
  "qwerty", "qwerty123", "abc12345", "iloveyou", "welcome",
  "admin", "admin123", "letmein", "monkey", "sunshine", "markethub",
]);

function score(pw: string): { score: 0 | 1 | 2 | 3 | 4; hint: string } {
  if (!pw) return { score: 0, hint: "" };
  if (pw.length < 8) return { score: 0, hint: "Use at least 8 characters." };
  if (COMMON.has(pw.toLowerCase())) {
    return { score: 0, hint: "This password is too common — pick something unique." };
  }
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const classes = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  // Penalize trivial repetition
  const isRepetitive = /(.)\1{3,}/.test(pw) || /^(..+)\1+$/.test(pw);
  if (isRepetitive) return { score: 1, hint: "Avoid repeated patterns." };

  if (classes <= 1) return { score: 1, hint: "Mix upper/lower case and numbers." };
  if (classes === 2) {
    if (pw.length >= 12) return { score: 2, hint: "Good — add a symbol for extra strength." };
    return { score: 2, hint: "Add numbers or symbols." };
  }
  if (classes === 3) {
    if (pw.length >= 12) return { score: 3, hint: "Strong. Add a symbol for max score." };
    return { score: 3, hint: "Strong — make it 12+ chars to max out." };
  }
  // All 4 classes
  if (pw.length >= 12) return { score: 4, hint: "Excellent." };
  return { score: 3, hint: "Almost maxed — make it 12+ chars." };
}

const LABELS: Record<number, { text: string; color: string }> = {
  0: { text: "Too weak", color: "#EF4444" },
  1: { text: "Weak", color: "#F97316" },
  2: { text: "Fair", color: "var(--color-primary)" },
  3: { text: "Strong", color: "#84CC16" },
  4: { text: "Excellent", color: "#10B981" },
};

export default function PasswordStrengthMeter({ password, showHint = true }: Props) {
  const { score: s, hint } = useMemo(() => score(password), [password]);
  const label = LABELS[s];

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1" aria-label={`Password strength: ${label.text}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all"
            style={{
              backgroundColor: i < s ? label.color : "rgba(0,0,0,0.08)",
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span style={{ color: label.color, fontWeight: 700 }}>{label.text}</span>
        {showHint && hint && (
          <span style={{ color: "#78614E" }}>{hint}</span>
        )}
      </div>
    </div>
  );
}
