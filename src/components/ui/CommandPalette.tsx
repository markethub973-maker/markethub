"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const COMMANDS = [
  { label: "Overview", path: "/", tag: "Analytics" },
  { label: "My Channel", path: "/my-channel", tag: "Analytics" },
  { label: "Top Videos", path: "/videos", tag: "Analytics" },
  { label: "Channels", path: "/channels", tag: "Analytics" },
  { label: "My Instagram", path: "/instagram", tag: "Platforms" },
  { label: "IG Search", path: "/instagram-search", tag: "Platforms" },
  { label: "Meta Insights", path: "/meta-insights", tag: "Platforms" },
  { label: "TikTok", path: "/tiktok", tag: "Platforms" },
  { label: "LinkedIn", path: "/linkedin", tag: "Platforms" },
  { label: "Competitors", path: "/competitors", tag: "Discover" },
  { label: "Ads Library", path: "/ads-library", tag: "Discover" },
  { label: "Trends", path: "/trends", tag: "Discover" },
  { label: "News", path: "/news", tag: "Discover" },
  { label: "Social Listening", path: "/social-listening", tag: "Discover" },
  { label: "Research Hub", path: "/research", tag: "Leads" },
  { label: "Lead Finder", path: "/lead-finder", tag: "Leads" },
  { label: "Leads Database", path: "/leads", tag: "Leads" },
  { label: "Content Calendar", path: "/calendar", tag: "Content" },
  { label: "Campaigns", path: "/campaigns", tag: "Content" },
  { label: "Assets & Storage", path: "/assets", tag: "Assets" },
  { label: "Clients", path: "/clients", tag: "Clients" },
  { label: "Admin Dashboard", path: "/dashboard/admin", tag: "Admin" },
  { label: "Integrations", path: "/integrations", tag: "Settings" },
  { label: "Settings", path: "/settings", tag: "Settings" },
];

const TAG_COLORS: Record<string, string> = {
  Analytics: "rgba(245,158,11,0.15)",
  Platforms: "rgba(59,130,246,0.15)",
  Discover: "rgba(16,185,129,0.15)",
  Leads: "rgba(168,85,247,0.15)",
  Content: "rgba(236,128,84,0.15)",
  Assets: "rgba(156,163,175,0.12)",
  Clients: "rgba(99,102,241,0.15)",
  Admin: "rgba(239,68,68,0.12)",
  Settings: "rgba(156,163,175,0.15)",
};

const TAG_TEXT: Record<string, string> = {
  Analytics: "#fbbf24",
  Platforms: "#93c5fd",
  Discover: "#6ee7b7",
  Leads: "#c4b5fd",
  Content: "#fbbf24",
  Assets: "#d1d5db",
  Clients: "#a5b4fc",
  Admin: "#fca5a5",
  Settings: "#d1d5db",
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const router = useRouter();

  const filtered = COMMANDS.filter(
    (c) =>
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.tag.toLowerCase().includes(query.toLowerCase()),
  );

  const execute = useCallback(
    (path: string) => {
      router.push(path);
      setOpen(false);
      setQuery("");
      setSelected(0);
    },
    [router],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setSelected(0);
      }
      if (!open) return;
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
      if (e.key === "ArrowDown") setSelected((s) => Math.min(s + 1, filtered.length - 1));
      if (e.key === "ArrowUp") setSelected((s) => Math.max(s - 1, 0));
      if (e.key === "Enter" && filtered[selected]) execute(filtered[selected].path);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selected, execute]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={() => {
          setOpen(false);
          setQuery("");
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "20vh",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          width: "min(580px, 90vw)",
          background: "rgba(13,11,30,0.85)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "16px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,158,11,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(245,158,11,0.7)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            placeholder="Search pages, analytics, admin..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "rgba(255,255,255,0.9)",
              fontSize: 14,
              fontFamily: "inherit",
            }}
          />
          <kbd
            style={{
              fontSize: 10,
              padding: "2px 7px",
              borderRadius: 5,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            Esc
          </kbd>
        </div>
        <div style={{ maxHeight: 320, overflowY: "auto", padding: "6px 8px" }}>
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          {filtered.map((cmd, i) => (
            <div
              key={cmd.path}
              onClick={() => execute(cmd.path)}
              onMouseEnter={() => setSelected(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 9,
                cursor: "pointer",
                background: selected === i ? "rgba(245,158,11,0.09)" : "transparent",
                border: selected === i ? "1px solid rgba(245,158,11,0.15)" : "1px solid transparent",
                marginBottom: 2,
                transition: "all 0.12s",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke={selected === i ? "#f59e0b" : "rgba(255,255,255,0.25)"}
                strokeWidth="2"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: selected === i ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.6)",
                }}
              >
                {cmd.label}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: TAG_COLORS[cmd.tag] ?? "rgba(255,255,255,0.08)",
                  color: TAG_TEXT[cmd.tag] ?? "rgba(255,255,255,0.5)",
                  border: `1px solid ${TAG_COLORS[cmd.tag] ?? "rgba(255,255,255,0.1)"}`,
                }}
              >
                {cmd.tag}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            padding: "10px 18px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            fontSize: 10,
            color: "rgba(255,255,255,0.25)",
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>Esc close</span>
        </div>
      </div>
    </>
  );
}
