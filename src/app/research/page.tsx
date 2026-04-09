"use client";

import React, { useState, useEffect, useRef } from "react";
import Header from "@/components/layout/Header";
import {
  Search, Instagram, Facebook, Globe, Loader2,
  ExternalLink, ThumbsUp, MessageCircle, Share2,
  Eye, Play, Hash, User, Users, TrendingUp, AlertCircle,
  Youtube, MessageSquare, Star, MapPin, ChevronDown,
  ChevronUp, Phone, FileText, ShoppingBag, Save, Check,
} from "lucide-react";
import { useUserRegion } from "@/lib/useUserRegion";
import { getLocalMarket } from "@/lib/localMarketConfig";

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const AMBER = "#F59E0B";
const IG = "#E1306C";
const FB = "#1877F2";
const TT = "#010101";
const YT = "#FF0000";
const RD = "#FF4500";
const GREEN = "#1DB954";

type Tab = string;

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

function timeAgo(ts: string | number) {
  if (!ts) return "";
  const d = typeof ts === "number" ? new Date(ts * 1000) : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TABS: { id: Tab; label: string; icon: React.ElementType; color: string; group: string }[] = [
  { id: "google",   label: "Google",    icon: Search,        color: AMBER, group: "Search" },
  { id: "youtube",  label: "YouTube",   icon: Play,          color: YT,    group: "Search" },
  { id: "website",  label: "Website",   icon: Globe,         color: "#6366F1", group: "Search" },
  { id: "instagram",label: "Instagram", icon: Instagram,     color: IG,    group: "Social" },
  { id: "tiktok",   label: "TikTok",    icon: Play,          color: TT,    group: "Social" },
  { id: "facebook", label: "Facebook",  icon: Facebook,      color: FB,    group: "Social" },
  { id: "fb_groups",label: "FB Groups", icon: Users,         color: FB,    group: "Social" },
  { id: "reddit",   label: "Reddit",    icon: MessageSquare, color: RD,    group: "Social" },
  { id: "reviews",  label: "Reviews",   icon: Star,          color: GREEN, group: "Local" },
];

export default function ResearchPage() {
  const [tab, setTab] = useState<Tab>("google");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"username" | "hashtag" | "channel" | "keyword" | "url" | "subreddit">("username");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [listView, setListView] = useState<"compact" | "detailed">("compact");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [savingLeads, setSavingLeads] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  // Pending deep-link from a `?tab=&q=` URL — captured on mount, fired once
  // we have a valid handleSearch reference. Cleared after the first run so a
  // browser back/forward doesn't re-trigger the same query.
  const pendingDeepLinkRef = useRef<{ tab: string; query: string; mode?: string } | null>(null);
  const deepLinkFiredRef = useRef(false);

  // On first mount, look for `?tab=...&q=...&mode=...` in the URL (used by
  // the Lead Finder "Caută acum în Research Hub" deep link). Set tab/query/mode
  // immediately and stash the request in a ref so a second effect can fire
  // handleSearch as soon as it's available.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const qParam = params.get("q");
    const modeParam = params.get("mode");
    if (tabParam && qParam) {
      setTab(tabParam);
      setQuery(qParam);
      if (modeParam) setMode(modeParam as any);
      pendingDeepLinkRef.current = { tab: tabParam, query: qParam, mode: modeParam || undefined };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Best-effort regex extractors used on already-crawled website text (no extra fetch needed)
  const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const PHONE_RE = /(?:\+?\d{1,3}[\s.\-()]*)?(?:\(?\d{2,4}\)?[\s.\-]?)?\d{3,4}[\s.\-]?\d{3,4}/g;
  const extractContactsFromText = (text: string): { emails: string[]; phones: string[] } => {
    if (!text) return { emails: [], phones: [] };
    const emails = [...new Set((text.match(EMAIL_RE) || []).map(e => e.toLowerCase()))]
      .filter(e => e.length < 80 && !e.includes("sentry") && !e.includes("example."))
      .slice(0, 5);
    const phones = [...new Set((text.match(PHONE_RE) || []).map(s => s.trim()))]
      .filter(s => {
        const d = s.replace(/\D/g, "");
        return d.length >= 8 && d.length <= 15 && !/^(19|20)\d{2}$/.test(d);
      })
      .slice(0, 5);
    return { emails, phones };
  };

  const postLeads = async (leads: any[]): Promise<{ ok: boolean; count: number; skipped: number; error?: string }> => {
    if (!leads.length) return { ok: false, count: 0, skipped: 0, error: "Niciun lead de salvat" };
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leads),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, count: 0, skipped: 0, error: json?.error || `HTTP ${res.status}` };
      return { ok: true, count: json?.count || 0, skipped: json?.skipped || 0 };
    } catch (e: any) {
      return { ok: false, count: 0, skipped: 0, error: e?.message || "Network error" };
    }
  };

  const handleSaveLeads = async () => {
    if (!results || savingLeads) return;
    setSavingLeads(true);
    setSaveStatus(null);
    try {
      let leads: any[] = [];

      if (tab === "google") {
        // Collect organic + paid URLs, dedupe by normalized URL, detect destination
        // platform per row (so a youtube.com link gets lead_type=youtube, not "website"),
        // then scrape only real websites for contacts (social URLs are JS-rendered shells).
        const items = (results.results || []).filter((r: any) => (r.type === "organic" || r.type === "ad") && r.url);

        // Normalize to dedupe Google's repeated organic/featured snippet rows pointing
        // to the same destination (e.g. youtube.com/@channel listed twice in 20 results).
        const normalizeUrl = (u: string): string => {
          try {
            const url = new URL(u);
            const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
            return host + url.pathname.replace(/\/$/, "").toLowerCase();
          } catch { return u; }
        };
        const seen = new Set<string>();
        const dedupedItems = items.filter((r: any) => {
          const key = normalizeUrl(r.url);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // Map hostname → real lead_type so the source pill in /leads shows the actual
        // destination platform (YouTube/Instagram/Facebook/etc.) instead of all rows
        // collapsing into a generic "Website" bucket.
        const detectPlatform = (url: string): string => {
          try {
            const h = new URL(url).hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
            if (h === "youtu.be" || h.endsWith("youtube.com")) return "youtube";
            if (h.endsWith("instagram.com")) return "instagram";
            if (h.endsWith("facebook.com") || h === "fb.com" || h.endsWith(".fb.com")) return "facebook";
            if (h.endsWith("tiktok.com")) return "tiktok";
            if (h.endsWith("reddit.com")) return "reddit";
            return "website";
          } catch { return "website"; }
        };

        // Only scrape real websites — social platform URLs return JS-rendered shells
        // or robots.txt blocks, so contact extraction would only burn time and rate limits.
        const websiteItems = dedupedItems.filter((r: any) => detectPlatform(r.url) === "website");
        const urls = websiteItems.map((r: any) => r.url).slice(0, 30);
        let contactsByUrl: Record<string, { emails: string[]; phones: string[]; name?: string | null }> = {};
        if (urls.length) {
          try {
            const res = await fetch("/api/leads/extract-from-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ urls }),
            });
            const json = await res.json();
            for (const r of json?.results || []) {
              contactsByUrl[r.url] = { emails: r.emails || [], phones: r.phones || [], name: r.name };
            }
          } catch {}
        }
        // Google sometimes returns Maps snippet rows with title="Hartă" / "Map" /
        // "Maps" / "Imagini" — useless as a lead name. Same for empty titles or
        // generic "Untitled". Fall back to scraper name → displayedUrl → hostname.
        const GENERIC_TITLES = new Set(["hartă", "harta", "map", "maps", "imagini", "images", "videoclipuri", "videos", "untitled", "—"]);
        const cleanGoogleName = (r: any, c: { name?: string | null }): string => {
          const t = (r.title || "").trim();
          if (t && !GENERIC_TITLES.has(t.toLowerCase())) return t;
          if (c.name && c.name.trim()) return c.name.trim();
          if (r.displayedUrl) return r.displayedUrl;
          try { return new URL(r.url).hostname.replace(/^www\./, ""); } catch { return r.url; }
        };
        leads = dedupedItems.map((r: any) => {
          const c = contactsByUrl[r.url] || { emails: [], phones: [] };
          const platform = detectPlatform(r.url);
          return {
            source: "research",
            lead_type: platform,
            name: cleanGoogleName(r, c),
            website: platform === "website" ? r.url : null,
            url: r.url,
            email: c.emails[0] || null,
            phone: c.phones[0] || null,
            description: r.description,
            goal: results.query,
            extra_data: {
              position: r.position,
              displayedUrl: r.displayedUrl,
              ad: r.type === "ad",
              emails: c.emails,
              phones: c.phones,
              originalTitle: r.title,
              discoveredVia: "google",
            },
          };
        });
      } else if (tab === "youtube") {
        leads = (results.videos || []).map((v: any) => ({
          source: "research",
          lead_type: "youtube",
          name: v.title,
          url: v.url,
          website: v.url,
          description: v.description,
          extra_data: { views: v.views, likes: v.likes, comments: v.comments, channel: v.channel, duration: v.duration, publishedAt: v.publishedAt },
        }));
        if (results.channelInfo) {
          leads.unshift({
            source: "research",
            lead_type: "youtube",
            name: results.channelInfo.name,
            url: results.channelInfo.url || null,
            extra_data: { followers: results.channelInfo.subscribers, isChannel: true },
          });
        }
      } else if (tab === "website") {
        // results.pages have full crawled text — extract contacts inline (no extra fetch)
        const allText = (results.pages || []).map((p: any) => p.text || "").join(" ");
        const { emails, phones } = extractContactsFromText(allText);
        leads = [{
          source: "research",
          lead_type: "website",
          name: results.home_title || results.domain,
          website: `https://${results.domain}`,
          url: `https://${results.domain}`,
          description: results.home_description,
          email: emails[0] || null,
          phone: phones[0] || null,
          extra_data: { pages: results.pages?.length, emails, phones },
        }];
      } else if (tab === "instagram") {
        if (results.profile) {
          leads.push({
            source: "research",
            lead_type: "instagram",
            name: `@${results.profile.username}`,
            url: `https://www.instagram.com/${results.profile.username}/`,
            extra_data: { followers: results.profile.followers, fullName: results.profile.fullName, isProfile: true },
          });
        }
        for (const p of (results.posts || [])) {
          leads.push({
            source: "research",
            lead_type: "instagram",
            name: `@${p.ownerUsername || results.profile?.username || "—"}`,
            url: p.url || (p.shortCode ? `https://www.instagram.com/p/${p.shortCode}/` : null),
            description: p.caption,
            extra_data: { likes: p.likes, comments: p.comments, engRate: p.engRate, type: p.type, views: p.videoViewCount, hashtags: p.hashtags },
          });
        }
      } else if (tab === "tiktok") {
        leads = (results.videos || []).map((v: any) => ({
          source: "research",
          lead_type: "tiktok",
          name: `@${v.author}`,
          url: v.url,
          description: v.description,
          extra_data: { plays: v.plays, likes: v.likes, shares: v.shares, comments: v.comments, followers: v.authorFollowers, verified: v.authorVerified, hashtags: v.hashtags, duration: v.duration },
        }));
      } else if (tab === "facebook") {
        if (results.pageInfo) {
          leads.push({
            source: "research",
            lead_type: "facebook",
            name: results.pageInfo.name,
            url: results.pageInfo.url || null,
            extra_data: { followers: results.pageInfo.followers, isPage: true },
          });
        }
        for (const p of (results.posts || [])) {
          leads.push({
            source: "research",
            lead_type: "facebook",
            name: results.pageInfo?.name || "Facebook post",
            url: p.url || null,
            description: p.text,
            extra_data: { likes: p.likes, comments: p.comments, shares: p.shares, reactions: p.reactions, time: p.time },
          });
        }
      } else if (tab === "fb_groups") {
        for (const p of (results.posts || [])) {
          leads.push({
            source: "research",
            lead_type: "facebook",
            name: p.author || results.groupInfo?.name || "FB group post",
            url: p.url || null,
            description: p.text,
            extra_data: {
              group: results.groupInfo?.name,
              groupUrl: results.groupInfo?.url,
              likes: p.likes,
              comments: p.comments,
              shares: p.shares,
              reactionsTotal: p.reactionsTotal,
              time: p.time,
              authorId: p.authorId,
              fromGroup: true,
            },
          });
        }
      } else if (tab === "reddit") {
        leads = (results.posts || []).map((p: any) => ({
          source: "research",
          lead_type: "reddit",
          name: p.title,
          url: p.permalink,
          description: p.text,
          extra_data: { subreddit: p.subreddit, score: p.score, numComments: p.numComments, flair: p.flair, createdAt: p.createdAt },
        }));
      } else {
        setSaveStatus({ kind: "err", msg: "Salvarea nu e disponibilă pentru acest tab" });
        setSavingLeads(false);
        return;
      }

      const r = await postLeads(leads);
      if (r.ok) {
        const parts = [`${r.count} lead-uri salvate`];
        if (r.skipped) parts.push(`${r.skipped} sărite (deja în DB)`);
        setSaveStatus({ kind: "ok", msg: parts.join(" • ") });
      } else {
        setSaveStatus({ kind: "err", msg: r.error || "Eroare la salvare" });
      }
    } catch (e: any) {
      setSaveStatus({ kind: "err", msg: e?.message || "Eroare neașteptată" });
    } finally {
      setSavingLeads(false);
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const SaveLeadsButton = ({ count, color }: { count: number; color: string }) => (
    <button type="button" onClick={handleSaveLeads} disabled={savingLeads || !count}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
      style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}40` }}>
      {savingLeads ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
      {savingLeads ? "Salvez..." : `Salvează ca lead-uri (${count})`}
    </button>
  );

  const toggleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => (d === "desc" ? "asc" : "desc"));
    else { setSortBy(key); setSortDir("desc"); }
  };

  const sortRows = <T,>(rows: T[], getter?: (r: T) => number): T[] => {
    if (!sortBy || !getter) return rows;
    return [...rows].sort((a, b) => {
      const diff = getter(b) - getter(a);
      return sortDir === "desc" ? diff : -diff;
    });
  };

  const sortIcon = (key: string) => sortBy === key
    ? (sortDir === "desc" ? <ChevronDown className="w-3 h-3 inline ml-0.5" /> : <ChevronUp className="w-3 h-3 inline ml-0.5" />)
    : null;

  const toggleSection = (key: string) => setExpandedSections(s => ({ ...s, [key]: !s[key] }));

  const { preferred_region, local_market_enabled, loading: regionLoading, refresh: refreshRegion } = useUserRegion();
  const localMarket = local_market_enabled ? getLocalMarket(preferred_region) : null;

  // One-click activation banner for Romanian market tools (OLX, Pagini Aurii,
  // Storia, Autovit). Hidden when already enabled, while loading, or after the
  // user dismisses it (persisted in localStorage so it doesn't nag).
  const [marketBannerDismissed, setMarketBannerDismissed] = useState(false);
  const [activatingMarket, setActivatingMarket] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setMarketBannerDismissed(localStorage.getItem("ro_market_banner_dismissed") === "1");
  }, []);
  const dismissMarketBanner = () => {
    setMarketBannerDismissed(true);
    if (typeof window !== "undefined") localStorage.setItem("ro_market_banner_dismissed", "1");
  };
  const activateRomanianMarket = async () => {
    setActivatingMarket(true);
    try {
      const res = await fetch("/api/settings/region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferred_region: "RO", local_market_enabled: true }),
      });
      if (res.ok) {
        refreshRegion();
        setSaveStatus({ kind: "ok", msg: "🇷🇴 Local Market Mode activat — tab-urile OLX, Pagini Aurii, Storia, Autovit sunt acum vizibile" });
        setTimeout(() => setSaveStatus(null), 4000);
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveStatus({ kind: "err", msg: data.error || "Activarea a eșuat" });
      }
    } catch (e) {
      setSaveStatus({ kind: "err", msg: "Activarea a eșuat" });
    } finally {
      setActivatingMarket(false);
    }
  };
  const localActorTabs = localMarket?.actors.map(a => ({
    id: a.id,
    label: a.label,
    icon: ShoppingBag as React.ElementType,
    color: localMarket.color,
    group: "Market",
  })) ?? [];
  const allTabs = [...TABS, ...localActorTabs];
  const groups = localMarket ? ["Search", "Social", "Local", "Market"] : ["Search", "Social", "Local"];

  const tabColor = allTabs.find(t => t.id === tab)?.color || AMBER;

  const getPlaceholder = () => {
    switch (tab) {
      case "google": return "Keyword (ex: wedding DJ New York)";
      case "youtube": return mode === "channel" ? "@channel (ex: @MrBeast)" : "Keyword (ex: social media marketing)";
      case "website": return "URL (ex: competitor.com)";
      case "instagram": return mode === "username" ? "@username (ex: @nike)" : "#hashtag (ex: marketing)";
      case "tiktok": return mode === "username" ? "@username (ex: @khaby.lame)" : "#hashtag (ex: business)";
      case "facebook": return "Page name (ex: Nike)";
      case "fb_groups": return "URL grup public (https://www.facebook.com/groups/...)";
      case "reddit": return mode === "subreddit" ? "subreddit (ex: Entrepreneur)" : "Keyword (ex: wedding DJ tips)";
      case "reviews": return "Place name or Google Maps URL";
      default: {
        const actor = localMarket?.actors.find(a => a.id === tab);
        return actor?.placeholder || "Search...";
      }
    }
  };

  const getModes = (): { id: string; label: string; icon: React.ElementType }[] => {
    switch (tab) {
      case "instagram":
      case "tiktok":
        return [
          { id: "username", label: "Profile", icon: User },
          { id: "hashtag", label: "Hashtag", icon: Hash },
        ];
      case "youtube":
        return [
          { id: "channel", label: "Channel", icon: Play },
          { id: "keyword", label: "Search", icon: Search },
        ];
      case "reddit":
        return [
          { id: "keyword", label: "Search", icon: Search },
          { id: "subreddit", label: "Subreddit", icon: Hash },
        ];
      default: return [];
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);
    setExpandedRows({});
    setSortBy(null);

    try {
      let endpoint = "";
      let body: Record<string, unknown> = {};

      switch (tab) {
        case "google":
          endpoint = "/api/research/google";
          body = { query: query.trim(), country: "us", language: "en" };
          break;
        case "youtube":
          endpoint = "/api/research/youtube";
          body = mode === "channel"
            ? { channel: query.trim(), limit: 15 }
            : { keyword: query.trim(), limit: 15 };
          break;
        case "website":
          endpoint = "/api/research/website";
          body = { url: query.trim(), maxPages: 5 };
          break;
        case "instagram":
          endpoint = "/api/research/instagram";
          body = mode === "username"
            ? { username: query.trim(), limit: 12 }
            : { hashtag: query.trim(), limit: 20 };
          break;
        case "tiktok":
          endpoint = "/api/research/tiktok";
          body = mode === "username"
            ? { username: query.trim(), limit: 15 }
            : { hashtag: query.trim(), limit: 20 };
          break;
        case "facebook":
          endpoint = "/api/research/facebook";
          body = { page: query.trim(), limit: 10 };
          break;
        case "fb_groups":
          endpoint = "/api/research/facebook-groups";
          body = { groupUrl: query.trim(), limit: 20 };
          break;
        case "reddit":
          endpoint = "/api/research/reddit";
          body = mode === "subreddit"
            ? { subreddit: query.trim(), limit: 20 }
            : { query: query.trim(), limit: 20 };
          break;
        case "reviews":
          endpoint = "/api/research/maps-reviews";
          body = query.startsWith("http")
            ? { placeUrl: query.trim(), maxReviews: 50 }
            : { placeName: query.trim(), maxReviews: 50 };
          break;
        default: {
          const actor = localMarket?.actors.find(a => a.id === tab);
          if (actor) {
            endpoint = actor.endpoint;
            body = actor.bodyBuilder(query.trim());
          }
          break;
        }
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Search failed");
      else setResults(data);
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  // Fire the deep-linked search exactly once, after the state from
  // `?tab=&q=` has settled. Guarded by deepLinkFiredRef so changing the tab
  // manually after the first auto-search does not re-trigger anything.
  useEffect(() => {
    const pending = pendingDeepLinkRef.current;
    if (!pending || deepLinkFiredRef.current) return;
    if (tab === pending.tab && query === pending.query) {
      deepLinkFiredRef.current = true;
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, query]);

  const modes = getModes();
  const currentTab = allTabs.find(t => t.id === tab) ?? allTabs[0];

  return (
    <div>
      <Header title="Research Hub" subtitle="Google · YouTube · Instagram · TikTok · Facebook · Reddit · Website · Reviews" />
      <div className="p-6 space-y-5">

        {/* Romanian market activation banner — 1-click enable for OLX/Pagini Aurii/Storia/Autovit */}
        {!regionLoading && !local_market_enabled && !marketBannerDismissed && (
          <div className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: "linear-gradient(135deg, rgba(0,43,127,0.08) 0%, rgba(252,209,22,0.10) 50%, rgba(206,17,38,0.08) 100%)", border: "1px solid rgba(0,43,127,0.25)" }}>
            <span className="text-3xl flex-shrink-0">🇷🇴</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: "#292524" }}>
                Activează Local Market Mode pentru România
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#78614E" }}>
                Adaugă 4 tab-uri noi în Research Hub: <strong>OLX.ro</strong> (scraper real cu preț, oraș, vânzător), <strong>Pagini Aurii</strong>, <strong>Storia.ro</strong>, <strong>Autovit.ro</strong> — gratis, 1 click.
              </p>
            </div>
            <button type="button" onClick={activateRomanianMarket} disabled={activatingMarket}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all flex-shrink-0"
              style={{ backgroundColor: "#002B7F", color: "white", boxShadow: "0 2px 8px rgba(0,43,127,0.3)" }}>
              {activatingMarket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {activatingMarket ? "Activare…" : "Activează"}
            </button>
            <button type="button" onClick={dismissMarketBanner}
              className="text-xs px-2 py-1 rounded-lg flex-shrink-0 hover:underline"
              style={{ color: "#A8967E" }}
              aria-label="Închide banner">
              Mai târziu
            </button>
          </div>
        )}

        {/* Tab selector grouped */}
        <div className="rounded-2xl p-5 space-y-4" style={card}>
          <div className="space-y-2">
            {groups.map(group => {
              const groupTabs = allTabs.filter(t => t.group === group);
              return (
                <div key={group} className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold w-12 flex-shrink-0" style={{ color: "#C4AA8A" }}>{group}</span>
                  {groupTabs.map(({ id, label, icon: Icon, color }) => (
                    <button key={id} type="button"
                      onClick={() => { setTab(id); setResults(null); setError(""); setQuery(""); setMode("username"); setSortBy(null); setExpandedRows({}); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={tab === id
                        ? { backgroundColor: color, color: id === "tiktok" ? "#FFF8F0" : "white", boxShadow: `0 2px 8px ${color}40` }
                        : { backgroundColor: "rgba(245,215,160,0.1)", color: "#78614E", border: "1px solid rgba(245,215,160,0.2)" }}>
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Mode toggle */}
          {modes.length > 0 && (
            <div className="flex gap-2">
              {modes.map(m => (
                <button key={m.id} type="button"
                  onClick={() => setMode(m.id as any)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={mode === m.id
                    ? { backgroundColor: tabColor + "20", color: tabColor, border: `1px solid ${tabColor}40` }
                    : { color: "#A8967E", border: "1px solid rgba(245,215,160,0.2)" }}>
                  <m.icon className="w-3 h-3" />{m.label}
                </button>
              ))}
            </div>
          )}

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ border: `1px solid ${tabColor}40`, backgroundColor: "#FFFDF9" }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: tabColor }} />
              <input type="text" value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder={getPlaceholder()}
                className="flex-1 text-sm bg-transparent focus:outline-none"
                style={{ color: "#292524" }} />
            </div>
            <button type="button" onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
              style={{ backgroundColor: tabColor, color: tab === "tiktok" ? "#FFF8F0" : "white" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Searching…" : "Search"}
            </button>
          </div>

          <p className="text-xs" style={{ color: "#C4AA8A" }}>
            {tab === "website" && "Extract content, pricing and structure from any competitor site. 15–60s."}
            {tab === "youtube" && "Scrape YouTube channel: videos, views, likes, comments."}
            {tab === "reddit" && "Find real discussions, feedback and opinions on any topic."}
            {tab === "reviews" && "Analyze Google Maps reviews — positive/negative sentiment, trends."}
            {(tab === "google" || tab === "instagram" || tab === "tiktok" || tab === "facebook") && "Powered by Apify — public data. 15–45s."}
            {localMarket?.actors.some(a => a.id === tab) && `${localMarket!.flag} ${localMarket!.actors.find(a => a.id === tab)?.description}`}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#DC2626", border: "1px solid rgba(239,68,68,0.15)" }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {/* Save status toast */}
        {saveStatus && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
            style={saveStatus.kind === "ok"
              ? { backgroundColor: "rgba(29,185,84,0.08)", color: GREEN, border: "1px solid rgba(29,185,84,0.2)" }
              : { backgroundColor: "rgba(239,68,68,0.08)", color: "#DC2626", border: "1px solid rgba(239,68,68,0.15)" }}>
            {saveStatus.kind === "ok" ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {saveStatus.msg}
            {saveStatus.kind === "ok" && (
              <a href="/leads" className="ml-2 underline">Vezi în Leads Database →</a>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl p-12 flex flex-col items-center gap-3" style={card}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: tabColor }} />
            <p className="text-sm font-semibold" style={{ color: "#78614E" }}>
              Apify is processing the request…
            </p>
          </div>
        )}

        {/* ── GOOGLE ── */}
        {!loading && results && tab === "google" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>{results.total} results for "{results.query}"</p>
              <SaveLeadsButton color={AMBER} count={(results.results || []).filter((r: any) => r.type === "organic" || r.type === "ad").length} />
            </div>
            {["ad", "organic", "paa", "related"].map(type => {
              const items = results.results?.filter((r: any) => r.type === type) || [];
              if (!items.length) return null;
              const labels: Record<string, string> = { ad: "Active ads", organic: "Organic results", paa: "People Also Ask", related: "Related searches" };
              return (
                <div key={type}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2"
                    style={{ color: type === "ad" ? "#DC2626" : "#78614E" }}>{labels[type]}</p>
                  {type === "related" ? (
                    <div className="flex flex-wrap gap-2">
                      {items.map((r: any, i: number) => (
                        <button key={i} type="button" onClick={() => setQuery(r.query)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E", border: "1px solid rgba(245,215,160,0.3)" }}>
                          <TrendingUp className="w-3 h-3 inline mr-1" />{r.query}
                        </button>
                      ))}
                    </div>
                  ) : type === "paa" ? (
                    <div className="rounded-xl overflow-hidden" style={card}>
                      {items.map((r: any, i: number) => (
                        <div key={i} className="px-4 py-3" style={{ borderBottom: "1px solid rgba(245,215,160,0.15)" }}>
                          <p className="text-sm font-semibold" style={{ color: "#292524" }}>{r.question}</p>
                          {r.answer && <p className="text-xs mt-1 line-clamp-2" style={{ color: "#78614E" }}>{r.answer}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((r: any, i: number) => (
                        <div key={i} className="rounded-xl p-4 flex items-start justify-between gap-2" style={card}>
                          <div className="flex-1 min-w-0">
                            {r.position && <span className="text-xs font-bold px-1.5 py-0.5 rounded mr-2"
                              style={{ backgroundColor: `${AMBER}15`, color: AMBER }}>#{r.position}</span>}
                            <a href={r.url} target="_blank" rel="noopener noreferrer"
                              className="text-sm font-semibold hover:underline" style={{ color: "#292524" }}>
                              {r.title}
                            </a>
                            <p className="text-xs mt-0.5" style={{ color: "#C4AA8A" }}>{r.displayedUrl}</p>
                            {r.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: "#78614E" }}>{r.description}</p>}
                          </div>
                          <a href={r.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#C4AA8A" }} />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── YOUTUBE ── */}
        {!loading && results && tab === "youtube" && (() => {
          const ytSort: Record<string, (v: any) => number> = {
            views: v => v.views || 0,
            likes: v => v.likes || 0,
            comments: v => v.comments || 0,
            posted: v => v.publishedAt ? new Date(v.publishedAt).getTime() : 0,
          };
          const sortedVideos = sortRows<any>(results.videos, sortBy ? ytSort[sortBy] : undefined);
          return (
          <div className="space-y-3">
            {results.channelInfo && (
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ ...card, borderColor: `${YT}30` }}>
                <Play className="w-8 h-8" style={{ color: YT }} />
                <div>
                  <p className="font-bold" style={{ color: "#292524" }}>{results.channelInfo.name}</p>
                  {results.channelInfo.subscribers > 0 && (
                    <p className="text-xs font-semibold" style={{ color: YT }}>{fmtNum(results.channelInfo.subscribers)} subscribers</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>{results.total} videos</p>
              <div className="flex items-center gap-2">
                <SaveLeadsButton color={YT} count={(results.videos || []).length + (results.channelInfo ? 1 : 0)} />
                <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "rgba(245,215,160,0.12)", border: "1px solid rgba(245,215,160,0.25)" }}>
                  {(["compact", "detailed"] as const).map(v => (
                    <button key={v} type="button" onClick={() => setListView(v)}
                      className="px-3 py-1 rounded-md text-xs font-bold transition-all"
                      style={listView === v ? { backgroundColor: YT, color: "white" } : { color: "#78614E" }}>
                      {v === "compact" ? "Mai puțin" : "Mai mult"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden" style={card}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: "rgba(245,215,160,0.12)", color: "#78614E" }}>
                      <th className="text-left px-3 py-2 font-bold">Titlu</th>
                      <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("views")} style={sortBy === "views" ? { color: YT } : undefined}><Eye className="w-3 h-3 inline mr-1" />Views{sortIcon("views")}</th>
                      <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("likes")} style={sortBy === "likes" ? { color: YT } : undefined}><ThumbsUp className="w-3 h-3 inline mr-1" />Likes{sortIcon("likes")}</th>
                      <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("posted")} style={sortBy === "posted" ? { color: YT } : undefined}>Postat{sortIcon("posted")}</th>
                      {listView === "detailed" && (
                        <>
                          <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("comments")} style={sortBy === "comments" ? { color: YT } : undefined}><MessageCircle className="w-3 h-3 inline mr-1" />Comm.{sortIcon("comments")}</th>
                          <th className="text-right px-3 py-2 font-bold">Durată</th>
                          <th className="text-left px-3 py-2 font-bold">Canal</th>
                        </>
                      )}
                      <th className="px-3 py-2"><span className="sr-only">Acțiuni</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedVideos.map((v: any, i: number) => {
                      const rowKey = String(v.id ?? i);
                      const isOpen = !!expandedRows[rowKey];
                      return (
                        <React.Fragment key={rowKey}>
                          <tr style={{ borderTop: "1px solid rgba(245,215,160,0.18)" }}>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {v.thumbnail && <img src={v.thumbnail} alt="" className="w-16 h-10 rounded object-cover flex-shrink-0" />}
                                <p className="font-semibold line-clamp-2" style={{ color: "#292524" }}>{v.title}</p>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums" style={{ color: YT }}>{fmtNum(v.views)}</td>
                            <td className="px-3 py-2 text-right tabular-nums" style={{ color: "#78614E" }}>{fmtNum(v.likes)}</td>
                            <td className="px-3 py-2 text-right" style={{ color: "#C4AA8A" }}>{v.publishedAt ? timeAgo(v.publishedAt) : "—"}</td>
                            {listView === "detailed" && (
                              <>
                                <td className="px-3 py-2 text-right tabular-nums" style={{ color: "#78614E" }}>{fmtNum(v.comments)}</td>
                                <td className="px-3 py-2 text-right" style={{ color: "#78614E" }}>{v.duration || "—"}</td>
                                <td className="px-3 py-2 max-w-[10rem]"><p className="truncate" style={{ color: "#A8967E" }}>{v.channel || "—"}</p></td>
                              </>
                            )}
                            <td className="px-3 py-2 text-right">
                              <button type="button" onClick={() => setExpandedRows(s => ({ ...s, [rowKey]: !s[rowKey] }))}
                                className="inline-flex items-center gap-0.5 font-semibold" style={{ color: YT }}>
                                {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {isOpen ? "Mai puțin" : "Mai mult"}
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr style={{ backgroundColor: "rgba(245,215,160,0.06)" }}>
                              <td colSpan={listView === "detailed" ? 8 : 5} className="px-4 py-3">
                                <div className="space-y-1">
                                  {v.description && <p style={{ color: "#292524" }}>{v.description}</p>}
                                  {v.url && (
                                    <a href={v.url} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 font-semibold" style={{ color: YT }}>
                                      <ExternalLink className="w-3 h-3" />Deschide pe YouTube
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          );
        })()}

        {/* ── WEBSITE ── */}
        {!loading && results && tab === "website" && (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <SaveLeadsButton color="#6366F1" count={1} />
            </div>
            <div className="rounded-xl p-4" style={{ ...card, borderColor: "rgba(99,102,241,0.3)" }}>
              <p className="font-bold" style={{ color: "#292524" }}>{results.domain}</p>
              {results.home_title && <p className="text-sm mt-0.5" style={{ color: "#78614E" }}>{results.home_title}</p>}
              {results.home_description && <p className="text-xs mt-1" style={{ color: "#A8967E" }}>{results.home_description}</p>}
              <p className="text-xs mt-2 font-semibold" style={{ color: "#6366F1" }}>{results.total} pages crawled</p>
            </div>
            {results.pages.map((p: any, i: number) => (
              <div key={i} className="rounded-xl p-4 space-y-2" style={card}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-semibold hover:underline" style={{ color: "#292524" }}>{p.title || p.url}</a>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "#C4AA8A" }}>{p.url}</p>
                  </div>
                  <span className="text-xs flex-shrink-0 px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "rgba(99,102,241,0.08)", color: "#6366F1" }}>
                    {p.wordCount} words
                  </span>
                </div>
                {p.text && (
                  <div>
                    <button type="button" onClick={() => toggleSection(`web-${i}`)}
                      className="flex items-center gap-1 text-xs font-semibold" style={{ color: AMBER }}>
                      {expandedSections[`web-${i}`] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {expandedSections[`web-${i}`] ? "Hide content" : "View extracted content"}
                    </button>
                    {expandedSections[`web-${i}`] && (
                      <p className="text-xs mt-2 leading-relaxed whitespace-pre-line"
                        style={{ color: "#78614E", maxHeight: 200, overflow: "auto" }}>{p.text}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── INSTAGRAM ── */}
        {!loading && results && tab === "instagram" && (() => {
          const igSort: Record<string, (p: any) => number> = {
            likes: p => p.likes || 0,
            comments: p => p.comments || 0,
            er: p => p.engRate || 0,
            views: p => p.videoViewCount || 0,
            posted: p => p.timestamp ? new Date(p.timestamp).getTime() : 0,
          };
          const sortedPosts = sortRows<any>(results.posts, sortBy ? igSort[sortBy] : undefined);
          return (
          <div className="space-y-3">
            {results.profile && (
              <div className="rounded-xl p-4 flex items-center gap-4" style={{ ...card, borderColor: `${IG}30` }}>
                {results.profile.profilePic && (
                  <img src={results.profile.profilePic} alt="" className="w-14 h-14 rounded-full object-cover"
                    style={{ border: `2px solid ${IG}` }} />
                )}
                <div>
                  <p className="font-bold" style={{ color: "#292524" }}>@{results.profile.username}</p>
                  {results.profile.fullName && <p className="text-sm" style={{ color: "#78614E" }}>{results.profile.fullName}</p>}
                  {results.profile.followers > 0 && <p className="text-xs mt-0.5 font-semibold" style={{ color: IG }}>{fmtNum(results.profile.followers)} followers</p>}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>{results.total} posts</p>
              <div className="flex items-center gap-2">
                <SaveLeadsButton color={IG} count={(results.posts || []).length + (results.profile ? 1 : 0)} />
                <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "rgba(245,215,160,0.12)", border: "1px solid rgba(245,215,160,0.25)" }}>
                  {(["compact", "detailed"] as const).map(v => (
                    <button key={v} type="button" onClick={() => setListView(v)}
                      className="px-3 py-1 rounded-md text-xs font-bold transition-all"
                      style={listView === v ? { backgroundColor: IG, color: "white" } : { color: "#78614E" }}>
                      {v === "compact" ? "Mai puțin" : "Mai mult"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden" style={card}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: "rgba(245,215,160,0.12)", color: "#78614E" }}>
                      <th className="text-left px-3 py-2 font-bold">Post</th>
                      <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("likes")} style={sortBy === "likes" ? { color: IG } : undefined}><ThumbsUp className="w-3 h-3 inline mr-1" />Likes{sortIcon("likes")}</th>
                      <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("comments")} style={sortBy === "comments" ? { color: IG } : undefined}><MessageCircle className="w-3 h-3 inline mr-1" />Comm.{sortIcon("comments")}</th>
                      <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("er")} style={sortBy === "er" ? { color: IG } : undefined}>ER{sortIcon("er")}</th>
                      {listView === "detailed" && (
                        <>
                          <th className="text-left px-3 py-2 font-bold">Tip</th>
                          <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("views")} style={sortBy === "views" ? { color: IG } : undefined}><Eye className="w-3 h-3 inline mr-1" />Views{sortIcon("views")}</th>
                          <th className="text-left px-3 py-2 font-bold">Caption</th>
                          <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("posted")} style={sortBy === "posted" ? { color: IG } : undefined}>Postat{sortIcon("posted")}</th>
                        </>
                      )}
                      <th className="px-3 py-2"><span className="sr-only">Acțiuni</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPosts.map((p: any, i: number) => {
                      const rowKey = String(p.id ?? p.shortCode ?? i);
                      const isOpen = !!expandedRows[rowKey];
                      const erColor = p.engRate != null && p.engRate >= 3 ? GREEN : AMBER;
                      return (
                        <React.Fragment key={rowKey}>
                          <tr style={{ borderTop: "1px solid rgba(245,215,160,0.18)" }}>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {p.thumbnail
                                  ? <img src={p.thumbnail} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                                  : <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(225,48,108,0.08)" }}>
                                      <Instagram className="w-4 h-4" style={{ color: IG }} />
                                    </div>}
                                <div className="min-w-0">
                                  <p className="font-bold truncate" style={{ color: IG }}>@{p.ownerUsername || "—"}</p>
                                  {listView === "compact" && p.caption && (
                                    <p className="text-[10px] truncate" style={{ color: "#A8967E" }}>{p.caption.slice(0, 40)}…</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums" style={{ color: "#292524" }}>{fmtNum(p.likes)}</td>
                            <td className="px-3 py-2 text-right tabular-nums" style={{ color: "#78614E" }}>{fmtNum(p.comments)}</td>
                            <td className="px-3 py-2 text-right font-bold tabular-nums" style={{ color: erColor }}>{p.engRate != null ? `${p.engRate}%` : "—"}</td>
                            {listView === "detailed" && (
                              <>
                                <td className="px-3 py-2" style={{ color: "#78614E" }}>{p.type || "—"}</td>
                                <td className="px-3 py-2 text-right tabular-nums" style={{ color: "#78614E" }}>{p.videoViewCount > 0 ? fmtNum(p.videoViewCount) : "—"}</td>
                                <td className="px-3 py-2 max-w-xs">
                                  <p className="line-clamp-2" style={{ color: "#78614E" }}>{p.caption || "—"}</p>
                                </td>
                                <td className="px-3 py-2 text-right" style={{ color: "#C4AA8A" }}>{p.timestamp ? timeAgo(p.timestamp) : "—"}</td>
                              </>
                            )}
                            <td className="px-3 py-2 text-right">
                              <button type="button" onClick={() => setExpandedRows(s => ({ ...s, [rowKey]: !s[rowKey] }))}
                                className="inline-flex items-center gap-0.5 font-semibold" style={{ color: IG }}>
                                {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {isOpen ? "Mai puțin" : "Mai mult"}
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr style={{ backgroundColor: "rgba(245,215,160,0.06)" }}>
                              <td colSpan={listView === "detailed" ? 9 : 5} className="px-4 py-3">
                                <div className="space-y-1">
                                  {p.caption && <p style={{ color: "#292524" }}>{p.caption}</p>}
                                  {p.hashtags?.length > 0 && (
                                    <p style={{ color: "#A8967E" }}>{p.hashtags.map((h: string) => `#${h}`).join(" ")}</p>
                                  )}
                                  <a href={p.url || `https://www.instagram.com/p/${p.shortCode}/`} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-semibold" style={{ color: IG }}>
                                    <ExternalLink className="w-3 h-3" />Deschide pe Instagram
                                  </a>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          );
        })()}

        {/* ── TIKTOK ── */}
        {!loading && results && tab === "tiktok" && (() => {
          const tikSort: Record<string, (v: any) => number> = {
            plays: v => v.plays || 0,
            likes: v => v.likes || 0,
            shares: v => v.shares || 0,
            comments: v => v.comments || 0,
            followers: v => v.authorFollowers || 0,
            posted: v => v.createTime || 0,
          };
          const sortedVideos = sortRows<any>(results.videos, sortBy ? tikSort[sortBy] : undefined);
          return (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>{results.total} videos</p>
              <div className="flex items-center gap-2">
                <SaveLeadsButton color={TT} count={(results.videos || []).length} />
                <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "rgba(245,215,160,0.12)", border: "1px solid rgba(245,215,160,0.25)" }}>
                  {(["compact", "detailed"] as const).map(v => (
                    <button key={v} type="button" onClick={() => setListView(v)}
                      className="px-3 py-1 rounded-md text-xs font-bold transition-all"
                      style={listView === v
                        ? { backgroundColor: TT, color: "#FFF8F0" }
                        : { color: "#78614E" }}>
                      {v === "compact" ? "Mai puțin" : "Mai mult"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden" style={card}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: "rgba(245,215,160,0.12)", color: "#78614E" }}>
                      <th className="text-left px-3 py-2 font-bold">Autor</th>
                      <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("plays")} style={sortBy === "plays" ? { color: TT } : undefined}><Eye className="w-3 h-3 inline mr-1" />Views{sortIcon("plays")}</th>
                      <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("likes")} style={sortBy === "likes" ? { color: TT } : undefined}><ThumbsUp className="w-3 h-3 inline mr-1" />Likes{sortIcon("likes")}</th>
                      <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("shares")} style={sortBy === "shares" ? { color: TT } : undefined}><Share2 className="w-3 h-3 inline mr-1" />Shares{sortIcon("shares")}</th>
                      {listView === "detailed" && (
                        <>
                          <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("comments")} style={sortBy === "comments" ? { color: TT } : undefined}><MessageCircle className="w-3 h-3 inline mr-1" />Comm.{sortIcon("comments")}</th>
                          <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("followers")} style={sortBy === "followers" ? { color: TT } : undefined}>Followers{sortIcon("followers")}</th>
                          <th className="text-left px-3 py-2 font-bold">Descriere</th>
                          <th className="text-left px-3 py-2 font-bold">Sunet</th>
                          <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("posted")} style={sortBy === "posted" ? { color: TT } : undefined}>Postat{sortIcon("posted")}</th>
                        </>
                      )}
                      <th className="px-3 py-2"><span className="sr-only">Acțiuni</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedVideos.map((v: any, i: number) => {
                      const rowKey = String(v.id ?? i);
                      const isOpen = !!expandedRows[rowKey];
                      return (
                        <React.Fragment key={rowKey}>
                          <tr style={{ borderTop: "1px solid rgba(245,215,160,0.18)" }}>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {v.cover && <img src={v.cover} alt="" className="w-9 h-12 rounded object-cover flex-shrink-0" />}
                                <div className="min-w-0">
                                  <p className="font-bold truncate" style={{ color: "#292524" }}>@{v.author}</p>
                                  {listView === "compact" && v.authorFollowers > 0 && (
                                    <p className="text-[10px]" style={{ color: "#A8967E" }}>{fmtNum(v.authorFollowers)} followers</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums" style={{ color: "#292524" }}>{fmtNum(v.plays)}</td>
                            <td className="px-3 py-2 text-right tabular-nums" style={{ color: "#78614E" }}>{fmtNum(v.likes)}</td>
                            <td className="px-3 py-2 text-right tabular-nums" style={{ color: "#78614E" }}>{fmtNum(v.shares)}</td>
                            {listView === "detailed" && (
                              <>
                                <td className="px-3 py-2 text-right tabular-nums" style={{ color: "#78614E" }}>{fmtNum(v.comments)}</td>
                                <td className="px-3 py-2 text-right tabular-nums" style={{ color: "#78614E" }}>{v.authorFollowers > 0 ? fmtNum(v.authorFollowers) : "—"}</td>
                                <td className="px-3 py-2 max-w-xs">
                                  <p className="line-clamp-2" style={{ color: "#78614E" }}>{v.description || "—"}</p>
                                </td>
                                <td className="px-3 py-2 max-w-[12rem]">
                                  {v.music ? <p className="truncate" style={{ color: "#A8967E" }}>♪ {v.music.name}</p> : <span style={{ color: "#C4AA8A" }}>—</span>}
                                </td>
                                <td className="px-3 py-2 text-right" style={{ color: "#C4AA8A" }}>{v.createTime ? timeAgo(v.createTime) : "—"}</td>
                              </>
                            )}
                            <td className="px-3 py-2 text-right">
                              <button type="button" onClick={() => setExpandedRows(s => ({ ...s, [rowKey]: !s[rowKey] }))}
                                className="inline-flex items-center gap-0.5 font-semibold" style={{ color: TT }}>
                                {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {isOpen ? "Mai puțin" : "Mai mult"}
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr style={{ backgroundColor: "rgba(245,215,160,0.06)" }}>
                              <td colSpan={listView === "detailed" ? 10 : 6} className="px-4 py-3">
                                <div className="space-y-1">
                                  {v.description && <p style={{ color: "#292524" }}>{v.description}</p>}
                                  {v.music && <p style={{ color: "#A8967E" }}>♪ {v.music.name} — {v.music.author}</p>}
                                  {v.hashtags?.length > 0 && (
                                    <p style={{ color: "#A8967E" }}>{v.hashtags.map((h: string) => `#${h}`).join(" ")}</p>
                                  )}
                                  <div className="flex gap-4 pt-1">
                                    {v.duration > 0 && <span style={{ color: "#A8967E" }}>{v.duration}s</span>}
                                    {v.url && (
                                      <a href={v.url} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 font-semibold" style={{ color: TT }}>
                                        <ExternalLink className="w-3 h-3" />Deschide pe TikTok
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          );
        })()}

        {/* ── FACEBOOK ── */}
        {!loading && results && tab === "facebook" && (() => {
          const fbReactions = (p: any): number => p.reactions && typeof p.reactions === "object"
            ? Object.values(p.reactions).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
            : 0;
          const fbSort: Record<string, (p: any) => number> = {
            likes: p => p.likes || 0,
            comments: p => p.comments || 0,
            shares: p => p.shares || 0,
            reactions: p => fbReactions(p),
            posted: p => p.time ? new Date(p.time).getTime() : 0,
          };
          const sortedPosts = sortRows<any>(results.posts, sortBy ? fbSort[sortBy] : undefined);
          return (
          <div className="space-y-3">
            {results.pageInfo && (
              <div className="rounded-xl p-4" style={{ ...card, borderColor: `${FB}30` }}>
                <p className="font-bold" style={{ color: "#292524" }}>{results.pageInfo.name}</p>
                {results.pageInfo.followers > 0 && <p className="text-xs font-semibold mt-0.5" style={{ color: FB }}>{fmtNum(results.pageInfo.followers)} followers</p>}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>{results.total} posts</p>
              <div className="flex items-center gap-2">
                <SaveLeadsButton color={FB} count={(results.posts || []).length + (results.pageInfo ? 1 : 0)} />
                <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "rgba(245,215,160,0.12)", border: "1px solid rgba(245,215,160,0.25)" }}>
                  {(["compact", "detailed"] as const).map(v => (
                    <button key={v} type="button" onClick={() => setListView(v)}
                      className="px-3 py-1 rounded-md text-xs font-bold transition-all"
                      style={listView === v ? { backgroundColor: FB, color: "white" } : { color: "#78614E" }}>
                      {v === "compact" ? "Mai puțin" : "Mai mult"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden" style={card}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: "rgba(245,215,160,0.12)", color: "#78614E" }}>
                      <th className="text-left px-3 py-2 font-bold">Post</th>
                      <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("likes")} style={sortBy === "likes" ? { color: FB } : undefined}><ThumbsUp className="w-3 h-3 inline mr-1" />Likes{sortIcon("likes")}</th>
                      <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("comments")} style={sortBy === "comments" ? { color: FB } : undefined}><MessageCircle className="w-3 h-3 inline mr-1" />Comm.{sortIcon("comments")}</th>
                      <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("shares")} style={sortBy === "shares" ? { color: FB } : undefined}><Share2 className="w-3 h-3 inline mr-1" />Shares{sortIcon("shares")}</th>
                      {listView === "detailed" && (
                        <>
                          <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("reactions")} style={sortBy === "reactions" ? { color: FB } : undefined}>Reacții{sortIcon("reactions")}</th>
                          <th className="text-left px-3 py-2 font-bold">Text</th>
                          <th className="text-right px-3 py-2 font-bold cursor-pointer select-none" onClick={() => toggleSort("posted")} style={sortBy === "posted" ? { color: FB } : undefined}>Postat{sortIcon("posted")}</th>
                        </>
                      )}
                      <th className="px-3 py-2"><span className="sr-only">Acțiuni</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPosts.map((p: any, i: number) => {
                      const rowKey = String(p.postId ?? i);
                      const isOpen = !!expandedRows[rowKey];
                      const reactionsTotal = fbReactions(p);
                      return (
                        <React.Fragment key={rowKey}>
                          <tr style={{ borderTop: "1px solid rgba(245,215,160,0.18)" }}>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {p.media
                                  ? <img src={p.media} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                                  : <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(24,119,242,0.08)" }}>
                                      <Facebook className="w-4 h-4" style={{ color: FB }} />
                                    </div>}
                                <div className="min-w-0">
                                  <p className="line-clamp-2" style={{ color: "#292524" }}>{p.text || "—"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums" style={{ color: FB }}>{fmtNum(p.likes)}</td>
                            <td className="px-3 py-2 text-right tabular-nums" style={{ color: "#78614E" }}>{fmtNum(p.comments)}</td>
                            <td className="px-3 py-2 text-right tabular-nums" style={{ color: "#78614E" }}>{fmtNum(p.shares)}</td>
                            {listView === "detailed" && (
                              <>
                                <td className="px-3 py-2 text-right tabular-nums" style={{ color: "#78614E" }}>{reactionsTotal > 0 ? fmtNum(reactionsTotal) : "—"}</td>
                                <td className="px-3 py-2 max-w-xs">
                                  <p className="line-clamp-2" style={{ color: "#78614E" }}>{p.text || "—"}</p>
                                </td>
                                <td className="px-3 py-2 text-right" style={{ color: "#C4AA8A" }}>{p.time ? timeAgo(p.time) : "—"}</td>
                              </>
                            )}
                            <td className="px-3 py-2 text-right">
                              <button type="button" onClick={() => setExpandedRows(s => ({ ...s, [rowKey]: !s[rowKey] }))}
                                className="inline-flex items-center gap-0.5 font-semibold" style={{ color: FB }}>
                                {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {isOpen ? "Mai puțin" : "Mai mult"}
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr style={{ backgroundColor: "rgba(245,215,160,0.06)" }}>
                              <td colSpan={listView === "detailed" ? 8 : 5} className="px-4 py-3">
                                <div className="space-y-1">
                                  {p.text && <p style={{ color: "#292524" }}>{p.text}</p>}
                                  {p.url && (
                                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 font-semibold" style={{ color: FB }}>
                                      <ExternalLink className="w-3 h-3" />Deschide pe Facebook
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          );
        })()}

        {/* ── FB GROUPS ── */}
        {!loading && results && tab === "fb_groups" && (() => {
          const fgSort: Record<string, (p: any) => number> = {
            likes: p => p.likes || 0,
            comments: p => p.comments || 0,
            shares: p => p.shares || 0,
            reactions: p => p.reactionsTotal || 0,
            posted: p => p.time ? new Date(p.time).getTime() : 0,
          };
          const sortedPosts = sortRows<any>(results.posts || [], sortBy ? fgSort[sortBy] : undefined);
          return (
          <div className="space-y-3">
            {results.groupInfo?.name && (
              <div className="rounded-xl p-4" style={{ ...card, borderColor: `${FB}30` }}>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: FB }} />
                  <p className="font-bold" style={{ color: "#292524" }}>Grup: {results.groupInfo.name}</p>
                </div>
                {results.groupInfo.url && (
                  <a href={results.groupInfo.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold mt-1" style={{ color: FB }}>
                    <ExternalLink className="w-3 h-3" />Deschide grupul
                  </a>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>{results.total} postări</p>
              <SaveLeadsButton color={FB} count={(results.posts || []).length} />
            </div>

            <div className="space-y-3">
              {sortedPosts.map((p: any, i: number) => {
                const rowKey = String(p.postId ?? i);
                const isOpen = !!expandedRows[rowKey];
                return (
                  <div key={rowKey} className="rounded-xl p-4" style={card}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {p.author && (
                            <span className="text-xs font-bold" style={{ color: FB }}>{p.author}</span>
                          )}
                          {p.time && (
                            <span className="text-xs" style={{ color: "#C4AA8A" }}>{timeAgo(p.time)}</span>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: "#292524" }}>
                          {isOpen ? p.text : (p.text || "").slice(0, 220) + ((p.text || "").length > 220 ? "…" : "")}
                        </p>
                        <div className="flex gap-4 mt-2 flex-wrap">
                          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: FB }}>
                            <ThumbsUp className="w-3 h-3" />{fmtNum(p.likes)}
                          </span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: "#78614E" }}>
                            <MessageCircle className="w-3 h-3" />{fmtNum(p.comments)}
                          </span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: "#78614E" }}>
                            <Share2 className="w-3 h-3" />{fmtNum(p.shares)}
                          </span>
                          {p.url && (
                            <a href={p.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: FB }}>
                              <ExternalLink className="w-3 h-3" />Postare
                            </a>
                          )}
                        </div>
                        {p.topComments?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {p.topComments.map((c: any, j: number) => (
                              <div key={j} className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "rgba(24,119,242,0.04)", borderLeft: `2px solid ${FB}30` }}>
                                {c.author && <span className="font-bold" style={{ color: FB }}>{c.author}: </span>}
                                <span style={{ color: "#78614E" }}>{c.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {(p.text || "").length > 220 && (
                        <button type="button" onClick={() => setExpandedRows(s => ({ ...s, [rowKey]: !s[rowKey] }))}
                          className="text-xs font-semibold flex-shrink-0" style={{ color: FB }}>
                          {isOpen ? "Mai puțin" : "Mai mult"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          );
        })()}

        {/* ── REDDIT ── */}
        {!loading && results && tab === "reddit" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>{results.total} posts</p>
              <SaveLeadsButton color={RD} count={(results.posts || []).length} />
            </div>
            {results.posts.map((p: any, i: number) => (
              <div key={i} className="rounded-xl p-4" style={card}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${RD}15`, color: RD }}>r/{p.subreddit}</span>
                      {p.flair && <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#A8967E" }}>{p.flair}</span>}
                    </div>
                    <a href={p.permalink} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-semibold hover:underline" style={{ color: "#292524" }}>{p.title}</a>
                    {p.text && <p className="text-xs mt-1 line-clamp-3" style={{ color: "#78614E" }}>{p.text}</p>}
                    <div className="flex gap-4 mt-2">
                      <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: RD }}>
                        <ThumbsUp className="w-3 h-3" />{fmtNum(p.score)}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                        <MessageCircle className="w-3 h-3" />{p.numComments} comments
                      </span>
                      {p.createdAt && <span className="text-xs" style={{ color: "#C4AA8A" }}>{timeAgo(p.createdAt)}</span>}
                    </div>
                    {p.topComments?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {p.topComments.map((c: any, j: number) => (
                          <div key={j} className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "rgba(255,69,0,0.04)", borderLeft: `2px solid ${RD}30` }}>
                            <span className="font-bold" style={{ color: RD }}>u/{c.author}: </span>
                            <span style={{ color: "#78614E" }}>{c.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── REVIEWS ── */}
        {!loading && results && tab === "reviews" && (
          <div className="space-y-4">
            {/* Sentiment summary */}
            <div className="rounded-xl p-4" style={{ ...card, borderColor: `${GREEN}30` }}>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: AMBER }}>{results.avg_rating}</p>
                  <p className="text-xs" style={{ color: "#A8967E" }}>average rating</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: GREEN }}>{results.sentiment?.positive}</p>
                  <p className="text-xs" style={{ color: "#A8967E" }}>positive (4-5★)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: "#EF4444" }}>{results.sentiment?.negative}</p>
                  <p className="text-xs" style={{ color: "#A8967E" }}>negative (1-2★)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: "#A8967E" }}>{results.total}</p>
                  <p className="text-xs" style={{ color: "#A8967E" }}>total reviews</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {results.reviews.map((r: any, i: number) => {
                const rColor = r.rating >= 4 ? GREEN : r.rating <= 2 ? "#EF4444" : AMBER;
                return (
                  <div key={i} className="rounded-xl p-4" style={card}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold" style={{ color: "#292524" }}>{r.reviewer}</span>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className="w-3 h-3" fill={s <= r.rating ? rColor : "none"}
                                style={{ color: rColor }} />
                            ))}
                          </div>
                          {r.publishedAt && <span className="text-xs" style={{ color: "#C4AA8A" }}>{timeAgo(r.publishedAt)}</span>}
                        </div>
                        {r.text && <p className="text-sm" style={{ color: "#78614E" }}>{r.text}</p>}
                        {r.ownerResponse && (
                          <div className="mt-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "rgba(245,158,11,0.06)", borderLeft: `2px solid ${AMBER}` }}>
                            <span className="font-bold" style={{ color: AMBER }}>Owner response: </span>
                            <span style={{ color: "#78614E" }}>{r.ownerResponse}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── LOCAL MARKET GENERIC RENDERER ── */}
        {!loading && results && localMarket?.actors.some(a => a.id === tab) && (
          <div className="space-y-3">
            {(() => {
              const actor = localMarket!.actors.find(a => a.id === tab)!;
              const items: any[] = Array.isArray(results)
                ? results
                : results.listings || results.results || results.items || [];
              return (
                <>
                  <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>
                    {localMarket!.flag} {actor.label} — {items.length} results
                  </p>
                  {items.length === 0 && (
                    <div className="rounded-xl p-8 text-center" style={card}>
                      <p className="text-sm" style={{ color: "#A8967E" }}>No results found</p>
                    </div>
                  )}
                  {items.map((item: any, i: number) => {
                    const cityLine = [item.city, item.district, item.region].filter(Boolean).join(", ");
                    return (
                      <div key={i} className="rounded-xl p-4 space-y-1.5" style={card}>
                        <div className="flex items-start gap-3">
                          {item.photo && (
                            <img src={item.photo} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0 space-y-1">
                            {item.title && <p className="font-semibold text-sm" style={{ color: "#292524" }}>{item.title}{item.isPromoted && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${localMarket!.color}15`, color: localMarket!.color }}>PROMOVAT</span>}</p>}
                            {item.name && !item.title && <p className="font-semibold text-sm" style={{ color: "#292524" }}>{item.name}</p>}
                            {item.price !== undefined && item.price !== null && (
                              <p className="text-sm font-bold" style={{ color: localMarket!.color }}>
                                {item.price} {item.currency || localMarket!.currency}
                                {item.negotiable && <span className="ml-1 text-[10px] font-normal" style={{ color: "#A8967E" }}>(negociabil)</span>}
                              </p>
                            )}
                            {cityLine && (
                              <p className="text-xs flex items-center gap-1" style={{ color: "#78614E" }}>
                                <MapPin className="w-3 h-3" />{cityLine}
                              </p>
                            )}
                            {item.address && (
                              <p className="text-xs flex items-center gap-1" style={{ color: "#78614E" }}>
                                <MapPin className="w-3 h-3" />{item.address}
                              </p>
                            )}
                            {item.sellerName && (
                              <p className="text-xs" style={{ color: "#A8967E" }}>
                                Vânzător: <span className="font-semibold" style={{ color: "#78614E" }}>{item.sellerName}</span>
                                {item.sellerType && ` · ${item.sellerType}`}
                              </p>
                            )}
                            {item.phone && (
                              <p className="text-xs flex items-center gap-1" style={{ color: "#78614E" }}>
                                <Phone className="w-3 h-3" />{item.phone}
                              </p>
                            )}
                            {item.description && (
                              <p className="text-xs" style={{ color: "#A8967E" }}>
                                {item.description.slice(0, 200)}{item.description.length > 200 ? "…" : ""}
                              </p>
                            )}
                            {item.url && (
                              <a href={item.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs inline-flex items-center gap-1 font-semibold"
                                style={{ color: localMarket!.color }}>
                                <ExternalLink className="w-3 h-3" />Deschide pe {actor.label}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        )}

        {/* Empty state */}
        {!loading && !results && !error && (
          <div className="rounded-2xl p-10 text-center" style={card}>
            <Search className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(196,170,138,0.4)" }} />
            <p className="font-semibold" style={{ color: "#78614E" }}>
              {localMarket ? `${localMarket.flag} ${8 + localMarket.actors.length} data sources available` : "8 data sources available"}
            </p>
            <p className="text-sm mt-1" style={{ color: "#C4AA8A" }}>
              Google · YouTube · Website · Instagram · TikTok · Facebook · Reddit · Reviews
              {localMarket && ` · ${localMarket.actors.map(a => a.label).join(" · ")}`}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
