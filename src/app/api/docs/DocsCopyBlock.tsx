"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  label: string;
  code: string;
}

export default function DocsCopyBlock({ label, code }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundColor: "var(--color-surface-dark)", color: "var(--color-bg)" }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "#A8967E" }}
        >
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 text-[10px] font-semibold transition-all hover:opacity-80"
          style={{ color: copied ? "#10B981" : "var(--color-primary)" }}
          aria-label="Copy"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className="px-4 py-3 text-xs overflow-x-auto"
        style={{
          backgroundColor: "#0F0C0A",
          color: "#E8D9C5",
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
