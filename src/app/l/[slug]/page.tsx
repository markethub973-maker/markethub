"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Zap, ExternalLink, Loader2 } from "lucide-react";

interface BioLink {
  id: string;
  slug: string;
  title: string;
  description: string;
  avatar_url: string;
  bg_color: string;
  accent_color: string;
  links: BioItem[];
  views: number;
}

interface BioItem {
  id: string;
  title: string;
  url: string;
  emoji: string;
  enabled: boolean;
  clicks: number;
}

export default function BioPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [bio, setBio] = useState<BioLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/bio-link/${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setBio(d.bio))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleClick = async (item: BioItem) => {
    // Track click
    await fetch("/api/bio-link", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, link_id: item.id }),
    }).catch(() => {});
    window.open(item.url, "_blank", "noopener,noreferrer");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F0" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F59E0B" }} />
    </div>
  );

  if (notFound || !bio) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: "#FFF8F0" }}>
      <p className="text-lg font-bold mb-2" style={{ color: "#292524" }}>Page not found</p>
      <p className="text-sm" style={{ color: "#A8967E" }}>This bio link doesn&apos;t exist or was removed.</p>
    </div>
  );

  const accent = bio.accent_color || "#F59E0B";
  const bg = bio.bg_color || "#FFF8F0";
  const enabledLinks = (bio.links || []).filter(l => l.enabled);

  return (
    <div className="min-h-screen py-12 px-4" style={{ backgroundColor: bg }}>
      <div className="max-w-sm mx-auto">

        {/* Avatar */}
        {bio.avatar_url ? (
          <img src={bio.avatar_url} alt={bio.title}
            className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
            style={{ border: `3px solid ${accent}` }} />
        ) : (
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
            style={{ backgroundColor: `${accent}20`, border: `3px solid ${accent}` }}>
            {bio.title ? bio.title[0].toUpperCase() : "M"}
          </div>
        )}

        {/* Title + description */}
        <h1 className="text-xl font-bold text-center mb-1" style={{ color: "#292524" }}>{bio.title}</h1>
        {bio.description && (
          <p className="text-sm text-center mb-6" style={{ color: "#78614E" }}>{bio.description}</p>
        )}
        {!bio.description && <div className="mb-6" />}

        {/* Links */}
        <div className="space-y-3">
          {enabledLinks.length === 0 && (
            <p className="text-center text-sm" style={{ color: "#C4AA8A" }}>No links yet.</p>
          )}
          {enabledLinks.map(item => (
            <button key={item.id} onClick={() => handleClick(item)}
              className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-left transition-all hover:scale-[1.02] hover:shadow-md"
              style={{ backgroundColor: "white", border: `1px solid ${accent}30`, boxShadow: `0 2px 8px ${accent}10` }}>
              {item.emoji && <span className="text-xl">{item.emoji}</span>}
              <span className="flex-1 text-sm font-semibold" style={{ color: "#292524" }}>{item.title}</span>
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accent }} />
            </button>
          ))}
        </div>

        {/* Branding */}
        <div className="mt-10 flex items-center justify-center gap-1.5">
          <Zap className="w-3.5 h-3.5" style={{ color: accent }} />
          <span className="text-xs font-semibold" style={{ color: "#C4AA8A" }}>Made with MarketHub Pro</span>
        </div>
      </div>
    </div>
  );
}
