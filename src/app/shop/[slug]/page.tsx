"use client";

/**
 * /shop/[slug] — public landing page for a Brain-generated product.
 *
 * Phase 1: reads product data from localStorage on the operator's
 * device (admin dashboard's storage). This means the page is fully
 * functional only on the device that generated it — perfect for
 * preview / share-from-admin flows.
 *
 * Phase 2: when brain.markethubpromo.com goes live with a Supabase
 * brain_products table, this page becomes server-rendered and works
 * for any visitor.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, ExternalLink, Sparkles, ShoppingBag } from "lucide-react";
import type { BrainProduct } from "@/lib/brainProducts";
import FeatureWorkflowDemo from "@/components/features/FeatureWorkflowDemo";

const STORAGE_KEY = "mhp_brain_products_v1";

function loadProducts(): BrainProduct[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as BrainProduct[]; }
  catch { return []; }
}

export default function ShopPage() {
  const params = useParams<{ slug: string }>();
  const [product, setProduct] = useState<BrainProduct | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const slug = params?.slug;
    if (!slug) return;
    const found = loadProducts().find((p) => p.slug === slug);
    setProduct(found ?? null);
    setMounted(true);
  }, [params]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFFCF7" }}>
        <p className="text-xs" style={{ color: "#A8967E" }}>Loading…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: "#FFFCF7" }}>
        <ShoppingBag className="w-10 h-10 mb-3" style={{ color: "#A8967E" }} />
        <p className="text-base font-bold" style={{ color: "#292524" }}>Product not found</p>
        <p className="text-xs mt-2 max-w-sm text-center" style={{ color: "#78614E" }}>
          This page is in Phase 1 — it lives in the operator&apos;s local storage. When it migrates to the central Brain database, every visitor will see it.
        </p>
        <Link href="/" className="text-xs font-bold mt-4 underline" style={{ color: "#D97706" }}>← Back home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFCF7" }}>
      <header className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
        <Link href="/" className="text-sm font-bold" style={{ color: "#292524" }}>
          <span style={{ color: "#F59E0B" }}>MarketHub Pro</span>
          <span className="ml-2 text-xs font-normal" style={{ color: "#78614E" }}>Recommends</span>
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {/* HERO */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          <div className="lg:col-span-3 space-y-5">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
              style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}
            >
              {product.category}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight" style={{ color: "#292524" }}>
              {product.hero_h1}
            </h1>
            <p className="text-lg" style={{ color: "#78614E", lineHeight: 1.5 }}>
              {product.tagline}
            </p>
            <div className="flex flex-wrap gap-3 pt-2 items-center">
              <a
                href={product.affiliate_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
                style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#1C1814" }}
              >
                {product.price_display ? `Buy now — ${product.price_display}` : "Buy now"}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              {product.affiliate_program && (
                <span className="text-[10px]" style={{ color: "#A8967E" }}>
                  Affiliate · {product.affiliate_program}
                </span>
              )}
            </div>
          </div>
          <div className="lg:col-span-2">
            {product.image_urls[0] ? (
              <div className="rounded-2xl overflow-hidden aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.image_urls[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : product.workflow_kind ? (
              <FeatureWorkflowDemo kind={product.workflow_kind} />
            ) : null}
          </div>
        </section>

        {/* DESCRIPTION */}
        {product.description && (
          <section className="max-w-3xl">
            {product.description.split(/\n\s*\n/).map((para, i) => (
              <p key={i} className="text-base mb-3" style={{ color: "#292524", lineHeight: 1.7 }}>
                {para}
              </p>
            ))}
          </section>
        )}

        {/* OUTCOMES */}
        {product.outcomes.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {product.outcomes.map((o, i) => (
              <div
                key={i}
                className="rounded-xl p-5"
                style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
              >
                <Sparkles className="w-5 h-5 mb-2" style={{ color: "#F59E0B" }} />
                <p className="text-sm font-bold mb-1" style={{ color: "#292524" }}>{o.label}</p>
                <p className="text-xs" style={{ color: "#78614E", lineHeight: 1.5 }}>{o.body}</p>
              </div>
            ))}
          </section>
        )}

        {/* STEPS */}
        {product.steps.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-5" style={{ color: "#292524" }}>How to use it</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {product.steps.map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl p-5 relative"
                  style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  <div
                    className="absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "white" }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-sm font-bold mb-2 mt-1" style={{ color: "#292524" }}>{s.heading}</p>
                  <p className="text-xs" style={{ color: "#78614E", lineHeight: 1.5 }}>{s.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FINAL CTA */}
        <section
          className="rounded-2xl p-8 text-center"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(139,92,246,0.08))", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#292524" }}>
            Ready to get the {product.name}?
          </h2>
          {product.price_display && (
            <p className="text-sm mb-5" style={{ color: "#78614E" }}>
              Listed at <strong>{product.price_display}</strong>
            </p>
          )}
          <a
            href={product.affiliate_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#1C1814" }}
          >
            <Check className="w-4 h-4" />
            Buy now
            <ArrowRight className="w-4 h-4" />
          </a>
          <p className="text-[10px] mt-4" style={{ color: "#A8967E" }}>
            We may earn a small commission when you purchase through this link — at no extra cost to you. We only recommend products we&apos;d use ourselves.
          </p>
        </section>
      </main>

      <footer className="px-6 py-6 text-center text-[11px]" style={{ color: "#A8967E", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        © 2026 MarketHub Pro — <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/terms" className="underline">Terms</Link>
      </footer>
    </div>
  );
}
