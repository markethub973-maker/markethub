"use client";

/**
 * Brain Products — admin dashboard for generating + managing the
 * affiliate / product landing pages that CEO Brain runs on the public
 * /shop/<slug> route.
 *
 * Storage: localStorage today (Phase 1). Will move to a brain_products
 * Supabase table when the brain.* subdomain is set up (Phase 2).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, Plus, Sparkles, Trash2, ExternalLink, Copy, Check, Wand2,
  ShoppingBag,
} from "lucide-react";
import type { BrainProduct } from "@/lib/brainProducts";

const STORAGE_KEY = "mhp_brain_products_v1";

function loadProducts(): BrainProduct[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as BrainProduct[]; }
  catch { return []; }
}
function saveProducts(list: BrainProduct[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* full */ }
}

export default function BrainProductsPage() {
  const [products, setProducts] = useState<BrainProduct[]>([]);
  const [mounted, setMounted] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [program, setProgram] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [audience, setAudience] = useState("");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    setProducts(loadProducts());
    setMounted(true);
  }, []);

  const generate = async () => {
    if (!name.trim() || !affiliateUrl.trim() || !imageUrl.trim() || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/brain/generate-product-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim() || undefined,
          affiliate_url: affiliateUrl.trim(),
          affiliate_program: program.trim() || undefined,
          image_urls: [imageUrl.trim()],
          price_display: priceDisplay.trim() || undefined,
          target_audience: audience.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      const next = [d.product as BrainProduct, ...products.filter((p) => p.slug !== d.product.slug)];
      setProducts(next);
      saveProducts(next);
      // Reset form
      setName(""); setCategory(""); setAffiliateUrl(""); setProgram("");
      setImageUrl(""); setPriceDisplay(""); setAudience(""); setNotes("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setGenerating(false);
    }
  };

  const remove = (slug: string) => {
    if (!confirm("Remove this product page from your library?")) return;
    const next = products.filter((p) => p.slug !== slug);
    setProducts(next);
    saveProducts(next);
  };

  const copyShopUrl = async (slug: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/shop/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 1500);
    } catch { /* noop */ }
  };

  const canSubmit = name.trim().length >= 3 && affiliateUrl.trim().length > 5 && imageUrl.trim().length > 5 && !generating;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFCF7" }}>
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <ShoppingBag className="w-6 h-6" style={{ color: "#F59E0B" }} />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#292524" }}>Brain Products</h1>
            <p className="text-xs" style={{ color: "#78614E" }}>
              Auto-generated affiliate / product landing pages. CEO Brain uses these to drive
              external revenue while you focus on the SaaS business.
            </p>
          </div>
        </div>

        {/* Generate form */}
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" style={{ color: "#F59E0B" }} />
            <h2 className="text-sm font-bold" style={{ color: "#292524" }}>
              Generate a new product page
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Product name *" v={name} setV={setName} placeholder="Sennheiser HD 660S Headphones" />
            <Field label="Category" v={category} setV={setCategory} placeholder="Audio · Studio gear" />
            <Field label="Affiliate URL *" v={affiliateUrl} setV={setAffiliateUrl} placeholder="https://amzn.to/abc123 (or your cloaked link)" />
            <Field label="Affiliate program" v={program} setV={setProgram} placeholder="Amazon Associates / Impact / Direct" />
            <Field label="Hero image URL *" v={imageUrl} setV={setImageUrl} placeholder="https://cdn.example.com/product.jpg" />
            <Field label="Price (display only)" v={priceDisplay} setV={setPriceDisplay} placeholder="$429" />
            <Field label="Target audience" v={audience} setV={setAudience} placeholder="Home producers + mixing engineers, $500-2k budget" full />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
              Notes / unique angle (optional but useful)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Why YOU recommend this. What makes it different. Any specific use case Brain should emphasize."
              className="w-full rounded-lg px-3 py-2 text-sm resize-none"
              style={{ backgroundColor: "#FFF8F0", border: "1px solid rgba(245,215,160,0.4)", color: "#292524", outline: "none" }}
            />
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#1C1814" }}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Generating page..." : "Generate landing page"}
          </button>

          {error && <p className="text-xs font-semibold" style={{ color: "#B91C1C" }}>{error}</p>}
        </section>

        {/* Library */}
        {mounted && (
          <section>
            <h2 className="text-sm font-bold mb-3" style={{ color: "#292524" }}>
              Your library — {products.length} product{products.length === 1 ? "" : "s"}
            </h2>
            {products.length === 0 ? (
              <div className="rounded-xl py-10 text-center" style={{ backgroundColor: "white", border: "1px dashed rgba(0,0,0,0.1)" }}>
                <ShoppingBag className="w-6 h-6 mx-auto mb-2" style={{ color: "#A8967E" }} />
                <p className="text-sm font-bold" style={{ color: "#292524" }}>No products yet</p>
                <p className="text-xs mt-1" style={{ color: "#78614E" }}>
                  Fill the form above to generate your first auto-landing page.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {products.map((p) => (
                  <div
                    key={p.slug}
                    className="rounded-xl p-4 flex flex-col gap-3"
                    style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <div className="flex items-start gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image_urls[0]}
                        alt={p.name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        style={{ backgroundColor: "rgba(0,0,0,0.03)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold" style={{ color: "#292524" }}>{p.name}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: "#78614E" }}>
                          {p.category}{p.price_display ? ` · ${p.price_display}` : ""}
                        </p>
                        <p className="text-[10px] mt-1 line-clamp-2" style={{ color: "#78614E" }}>{p.tagline}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.tags.slice(0, 4).map((t) => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(245,158,11,0.08)", color: "#D97706" }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1 border-t" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                      <Link
                        href={`/shop/${p.slug}`}
                        target="_blank"
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-bold"
                        style={{ backgroundColor: "#F59E0B", color: "#1C1814" }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Preview
                      </Link>
                      <button
                        type="button"
                        onClick={() => copyShopUrl(p.slug)}
                        className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-bold"
                        style={{ backgroundColor: copiedSlug === p.slug ? "#10B981" : "rgba(0,0,0,0.04)", color: copiedSlug === p.slug ? "white" : "#78614E" }}
                      >
                        {copiedSlug === p.slug ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedSlug === p.slug ? "Copied" : "URL"}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(p.slug)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded"
                        style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444" }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function Field({ label, v, setV, placeholder, full }: { label: string; v: string; setV: (s: string) => void; placeholder?: string; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>{label}</label>
      <input
        type="text"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2 text-sm"
        style={{ backgroundColor: "#FFF8F0", border: "1px solid rgba(245,215,160,0.4)", color: "#292524", outline: "none" }}
      />
    </div>
  );
}
