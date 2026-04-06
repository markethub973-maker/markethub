"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronRight, ChevronLeft, SkipForward } from "lucide-react";
import type { TourStep } from "@/lib/tourConfig";

interface TourOverlayProps {
  steps: TourStep[];
  onComplete: () => void;
  onClose: () => void;
}

interface Rect {
  top: number; left: number; width: number; height: number;
}

const PAD = 12;

export default function TourOverlay({ steps, onComplete, onClose }: TourOverlayProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);

  const step = steps[index];

  const findTarget = useCallback(() => {
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) {
      setRect(null);
      setTooltipPos({ top: window.innerHeight / 2 - 80, left: window.innerWidth / 2 - 160 });
      setVisible(true);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });

      // Calculate tooltip position
      const TW = 320; const TH = 180;
      const pos = step.position;
      let top = r.top + r.height / 2 - TH / 2;
      let left = r.left + r.width / 2 - TW / 2;

      if (pos === "bottom") { top = r.bottom + PAD; left = r.left + r.width / 2 - TW / 2; }
      if (pos === "top")    { top = r.top - TH - PAD; left = r.left + r.width / 2 - TW / 2; }
      if (pos === "right")  { top = r.top + r.height / 2 - TH / 2; left = r.right + PAD; }
      if (pos === "left")   { top = r.top + r.height / 2 - TH / 2; left = r.left - TW - PAD; }

      // Clamp within viewport
      top = Math.max(8, Math.min(top, window.innerHeight - TH - 8));
      left = Math.max(8, Math.min(left, window.innerWidth - TW - 8));

      setTooltipPos({ top, left });
      setVisible(true);
    }, 400);
  }, [step]);

  useEffect(() => {
    setVisible(false);
    if (step.page && window.location.pathname !== step.page) {
      router.push(step.page);
      setTimeout(findTarget, 800);
    } else {
      setTimeout(findTarget, 300);
    }
  }, [index, step, router, findTarget]);

  const next = () => {
    if (index < steps.length - 1) setIndex(i => i + 1);
    else onComplete();
  };

  const prev = () => { if (index > 0) setIndex(i => i - 1); };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 pointer-events-auto" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose} />

      {/* Spotlight cutout */}
      {rect && (
        <div
          className="absolute rounded-xl pointer-events-none"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
            border: "2px solid rgba(245,158,11,0.8)",
            zIndex: 10000,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute pointer-events-auto rounded-2xl p-5 shadow-2xl"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: 320,
          background: "#1C1814",
          border: "1px solid rgba(245,158,11,0.3)",
          zIndex: 10001,
        }}
      >
        {/* Progress dots */}
        <div className="flex gap-1 mb-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                flex: i === index ? 2 : 1,
                background: i === index ? "#F59E0B" : i < index ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </div>

        {/* Content */}
        <h3 className="font-bold text-base mb-1" style={{ color: "#FFF8F0" }}>{step.title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: "#A8967E" }}>{step.description}</p>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
            style={{ color: "#666" }}
          >
            <SkipForward size={12} /> Skip tour
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "#666" }}>{index + 1}/{steps.length}</span>
            {index > 0 && (
              <button
                type="button"
                onClick={prev}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.06)", color: "#A8967E" }}
              >
                <ChevronLeft size={13} /> Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#1C1814" }}
            >
              {index < steps.length - 1 ? <><span>Next</span><ChevronRight size={13} /></> : <span>Finish 🎉</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
