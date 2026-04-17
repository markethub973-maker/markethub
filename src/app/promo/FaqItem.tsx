"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "rgba(255,255,255,0.95)";
const MUTED = "rgba(255,255,255,0.55)";
const CHEVRON = "rgba(255,255,255,0.35)";

// Accordion item isolated as a client component so the rest of /promo can
// render as a Server Component. This is the only piece of interactive state
// on the page — everything else is static marketing content.
export default function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="font-semibold text-sm pr-4" style={{ color: TEXT }}>{q}</span>
        <ChevronDown
          className="w-4 h-4 flex-shrink-0 transition-transform"
          style={{ color: CHEVRON, transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed" style={{ color: MUTED }}>{a}</p>
      )}
    </div>
  );
}
