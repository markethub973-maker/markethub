"use client";

/**
 * Brain Command Center — Outreach Batch Sender
 * Paste a list of domains, Alex enriches + composes + sends.
 */

import { useState } from "react";
import Link from "next/link";
import { Loader2, Send, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

interface ResultRow {
  domain: string;
  status: string;
  email?: string;
  language?: string;
  subject?: string;
  body?: string;
}

export default function OutreachBatchPage() {
  const [input, setInput] = useState(
    [
      "dentalpremier.ro",
      "dental-med.ro",
      "dentestet.ro",
      "llldental.ro",
      "dentaline-clinic.ro",
      "stomestet.ro",
      "platinumdentalcenter.ro",
      "mdclinic.ro",
      "medestet.ro",
      "artis3.ro",
      "q-clinic.ro",
      "novia-estetica.ro",
      "spitalulzetta.ro",
      "timar.ro",
      "infinitrade-romania.ro",
      "elko.ro",
      "metigla.ro",
      "caretta.ro",
      "cemacon.ro",
      "accountingstudio.ro",
    ].join("\n"),
  );
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const leads = input
        .split("\n")
        .map((s) => s.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""))
        .filter(Boolean)
        .map((domain) => ({ domain }));
      const res = await fetch("/api/brain/outreach-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads, dry_run: dryRun }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Batch failed");
      setResults(d.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Batch failed");
    } finally {
      setLoading(false);
    }
  };

  const sent = results.filter((r) => r.status === "sent").length;
  const dry = results.filter((r) => r.status === "dry_run").length;
  const failed = results.filter((r) => r.status !== "sent" && r.status !== "dry_run").length;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#0F0F14",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center gap-3">
        <Link
          href="/"
          className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md"
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#bbb",
          }}
        >
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div>
          <p className="text-sm font-semibold">Outreach Batch · Alex is the sender</p>
          <p className="text-xs" style={{ color: "#888" }}>
            Paste domains — Alex fetches each site, writes a personalized email, sends from
            alex@markethubpromo.com.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16 space-y-5">
        <section
          className="p-5 rounded-2xl"
          style={{ backgroundColor: "#1A1A24", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <label className="text-xs uppercase tracking-wider font-bold" style={{ color: "#888" }}>
            Domains (one per line, max 25 per batch)
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={10}
            className="w-full mt-2 rounded-md p-3 text-sm font-mono"
            style={{
              backgroundColor: "#0F0F14",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white",
              outline: "none",
            }}
          />
          <div className="flex items-center gap-4 mt-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              <span>
                Dry run — preview only, don't send
                <span style={{ color: "#888" }}> (recommended for first test)</span>
              </span>
            </label>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm disabled:opacity-50"
            style={{ backgroundColor: "#F59E0B", color: "black" }}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {dryRun ? "Generating previews..." : "Sending..."}</>
            ) : (
              <><Send className="w-4 h-4" /> {dryRun ? "Preview batch" : "Send batch now"}</>
            )}
          </button>
          {error && (
            <p className="text-xs font-semibold mt-3" style={{ color: "#F87171" }}>
              {error}
            </p>
          )}
        </section>

        {results.length > 0 && (
          <section>
            <p className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: "#888" }}>
              Results · {sent} sent · {dry} previewed · {failed} failed
            </p>
            <div className="space-y-2">
              {results.map((r, i) => {
                const ok = r.status === "sent" || r.status === "dry_run";
                return (
                  <div
                    key={i}
                    className="p-4 rounded-xl"
                    style={{
                      backgroundColor: "#1A1A24",
                      borderLeft: `3px solid ${ok ? "#10B981" : "#EF4444"}`,
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1 text-sm">
                      {ok ? (
                        <CheckCircle2 className="w-4 h-4" style={{ color: "#10B981" }} />
                      ) : (
                        <AlertCircle className="w-4 h-4" style={{ color: "#EF4444" }} />
                      )}
                      <span className="font-semibold">{r.domain}</span>
                      <span style={{ color: "#888" }}>
                        · {r.status}
                        {r.language ? ` · ${r.language}` : ""}
                        {r.email ? ` · ${r.email}` : ""}
                      </span>
                    </div>
                    {r.subject && (
                      <p className="text-xs font-semibold mt-2">{r.subject}</p>
                    )}
                    {r.body && (
                      <pre
                        className="text-xs mt-2 whitespace-pre-wrap"
                        style={{ color: "#bbb", lineHeight: 1.55, fontFamily: "inherit" }}
                      >
                        {r.body}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
