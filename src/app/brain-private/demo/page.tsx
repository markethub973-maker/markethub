"use client";

/**
 * Brain Command Center — Demo Generator
 * Paste prospect's domain + email → Alex fetches site, generates 5 captions
 * + 3 image prompts + emails them as a free demo.
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, Sparkles } from "lucide-react";

interface Caption { platform: string; text: string; }
interface Demo { brand_summary: string; tone: string; captions: Caption[]; image_prompts: string[]; }

export default function DemoPage() {
  const [domain, setDomain] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [demo, setDemo] = useState<Demo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const generate = async (alsoEmail: boolean) => {
    setLoading(true);
    setError(null);
    setDemo(null);
    setSent(false);
    try {
      const res = await fetch("/api/brain/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim(), to_email: alsoEmail ? toEmail.trim() : undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Demo failed");
      setDemo(d.demo);
      if (alsoEmail) setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0F0F14", color: "white", fontFamily: "system-ui, sans-serif" }}>
      <header className="max-w-4xl mx-auto px-6 py-6 flex items-center gap-3">
        <Link href="/" className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#bbb" }}>
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div>
          <p className="text-sm font-semibold">Demo Generator</p>
          <p className="text-xs" style={{ color: "#888" }}>
            Alex fetches the prospect&apos;s site, writes 5 sample captions + 3 image prompts, and (optionally) emails them.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-16 space-y-5">
        <section className="p-5 rounded-2xl"
          style={{ backgroundColor: "#1A1A24", border: "1px solid rgba(255,255,255,0.08)" }}>
          <label className="text-xs uppercase tracking-wider font-bold" style={{ color: "#888" }}>Prospect domain</label>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="dentalpremier.ro"
            className="w-full mt-2 rounded-md px-3 py-2 text-sm"
            style={{ backgroundColor: "#0F0F14", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }}
          />
          <label className="text-xs uppercase tracking-wider font-bold mt-4 block" style={{ color: "#888" }}>Their email (optional — if set, Alex emails the demo directly)</label>
          <input
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            placeholder="contact@dentalpremier.ro"
            type="email"
            className="w-full mt-2 rounded-md px-3 py-2 text-sm"
            style={{ backgroundColor: "#0F0F14", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }}
          />
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => generate(false)} disabled={loading || !domain}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm disabled:opacity-50"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate preview</>}
            </button>
            <button type="button" onClick={() => generate(true)} disabled={loading || !domain || !toEmail}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm disabled:opacity-50"
              style={{ backgroundColor: "#F59E0B", color: "black" }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Generate + email to prospect</>}
            </button>
          </div>
          {error && <p className="text-xs font-semibold mt-3" style={{ color: "#F87171" }}>{error}</p>}
          {sent && <p className="text-xs font-semibold mt-3" style={{ color: "#10B981" }}>✅ Demo sent to {toEmail} from alex@markethubpromo.com.</p>}
        </section>

        {demo && (
          <section className="space-y-4">
            <div className="p-4 rounded-xl" style={{ backgroundColor: "#1A1A24", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: "#F59E0B" }}>Brand snapshot</p>
              <p className="text-sm mb-2">{demo.brand_summary}</p>
              <p className="text-xs" style={{ color: "#888" }}>Voice: {demo.tone}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: "#888" }}>5 sample captions</p>
              <div className="space-y-2">
                {demo.captions.map((c, i) => (
                  <div key={i} className="p-3 rounded-xl"
                    style={{ backgroundColor: "#1A1A24", borderLeft: "3px solid #F59E0B", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-xs font-bold uppercase mb-1" style={{ color: "#F59E0B" }}>{c.platform}</p>
                    <p className="text-sm whitespace-pre-wrap">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: "#888" }}>3 image prompts</p>
              <div className="space-y-2">
                {demo.image_prompts.map((p, i) => (
                  <div key={i} className="p-3 rounded-xl text-sm"
                    style={{ backgroundColor: "#1A1A24", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "#888" }}>Image {i + 1}: </span>{p}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
