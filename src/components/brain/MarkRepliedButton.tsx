"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

export default function MarkRepliedButton({ id, alreadyReplied }: { id: number; alreadyReplied: boolean }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(alreadyReplied);

  const onClick = async () => {
    if (done) return;
    setLoading(true);
    try {
      const res = await fetch("/api/brain/mark-replied", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || done}
      className="text-xs px-2 py-0.5 rounded-md inline-flex items-center gap-1"
      style={{
        backgroundColor: done ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
        color: done ? "#10B981" : "#F59E0B",
        border: `1px solid ${done ? "rgba(16,185,129,0.4)" : "rgba(245,158,11,0.4)"}`,
      }}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
      {done ? "Replied" : "Mark replied"}
    </button>
  );
}
