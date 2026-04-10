"use client";

import { Bell, Search, ChevronDown, LogOut, User, AlertTriangle, Info, CheckCircle, XCircle, ArrowRight, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightExtra?: React.ReactNode;
}

interface Notification {
  id: string;
  type: "warning" | "error" | "info" | "success";
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  created_at: string;
  read: boolean;
}

const SEARCH_CONFIG: Record<string, { placeholder: string }> = {
  "/videos":      { placeholder: "Search YouTube videos..." },
  "/trending":    { placeholder: "Search trending videos..." },
  "/news":        { placeholder: "Search news..." },
  "/ads-library": { placeholder: "Search ads & brands..." },
  "/my-channel":  { placeholder: "Search my videos..." },
  "/channels":    { placeholder: "Search channels..." },
  "/trends":      { placeholder: "Search Google Trends keyword..." },
  "/calendar":    { placeholder: "Search posts..." },
};

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  warning: <AlertTriangle size={14} style={{ color: "#F59E0B" }} />,
  error:   <XCircle size={14} style={{ color: "#EF4444" }} />,
  info:    <Info size={14} style={{ color: "#3B82F6" }} />,
  success: <CheckCircle size={14} style={{ color: "#16A34A" }} />,
};

const NOTIF_BG: Record<string, string> = {
  warning: "rgba(245,158,11,0.08)",
  error:   "rgba(239,68,68,0.08)",
  info:    "rgba(59,130,246,0.08)",
  success: "rgba(22,163,74,0.08)",
};

export default function Header({ title, subtitle, rightExtra }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [username, setUsername] = useState("admin");
  const [plan, setPlan] = useState("Free Plan");
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [notifsLoaded, setNotifsLoaded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const searchConfig = SEARCH_CONFIG[pathname];
  const showSearch = !!searchConfig;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("name, full_name, email, subscription_plan, plan")
        .eq("id", user.id)
        .single();
      if (data) {
        const name = data.name || data.full_name || user.email?.split("@")[0] || "User";
        setUsername(name);
        localStorage.setItem("mh_user", name);
        const p = data.subscription_plan || data.plan || "free_test";
        setPlan(p.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()));
      }
    });
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnread(data.unread || 0);
      setNotifsLoaded(true);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => { setSearchQuery(""); }, [pathname]);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      router.push(`${pathname}?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem("mh_user");
    router.push("/login");
  };

  const handleOpenNotifs = () => {
    setShowNotifs(v => !v);
    setShowMenu(false);
    if (!showNotifs) setUnread(0); // mark as read when opened
  };

  return (
    <header
      data-tour="page-header"
      className="h-16 flex items-center justify-between px-6 sticky top-0 z-30"
      style={{ backgroundColor: "#FFFCF7", borderBottom: "1px solid rgba(245,215,160,0.25)" }}
    >
      <div>
        <h1 className="text-xl font-bold" style={{ color: "#292524" }}>{title}</h1>
        {subtitle && <p className="text-xs" style={{ color: "#A8967E" }}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Context search */}
        {showSearch && (
          <div className="relative hidden md:flex items-center">
            <Search className="absolute left-3 w-4 h-4" style={{ color: "#C4AA8A" }} />
            <input
              type="text"
              placeholder={searchConfig.placeholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="pl-9 pr-4 py-2 text-sm rounded-lg w-60 focus:outline-none"
              style={{ backgroundColor: "#F5EFE6", border: "1px solid rgba(245,215,160,0.3)", color: "#292524" }}
              onFocus={e => (e.currentTarget.style.border = "1px solid #F59E0B")}
              onBlur={e => (e.currentTarget.style.border = "1px solid rgba(245,215,160,0.3)")}
            />
          </div>
        )}

        {/* Extra right content (e.g. admin logout button) */}
        {rightExtra}

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            aria-label="Notifications"
            onClick={handleOpenNotifs}
            className="relative p-2 rounded-lg transition-colors"
            style={{ color: "#78614E" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.15)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: "#EF4444", fontSize: "9px", padding: "0 3px" }}
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div
              className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50"
              style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.35)", boxShadow: "0 8px 32px rgba(120,97,78,0.15)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                <span className="text-sm font-bold" style={{ color: "#292524" }}>Notifications</span>
                <button type="button" onClick={() => setShowNotifs(false)} aria-label="Close">
                  <X size={14} style={{ color: "#A8967E" }} />
                </button>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm" style={{ color: "#A8967E" }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="px-4 py-3" style={{ borderBottom: "1px solid rgba(245,215,160,0.1)", backgroundColor: n.read ? "transparent" : NOTIF_BG[n.type] }}>
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex-shrink-0">{NOTIF_ICONS[n.type]}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold mb-0.5" style={{ color: "#292524" }}>{n.title}</p>
                          <p className="text-xs leading-relaxed" style={{ color: "#78716C" }}>{n.message}</p>
                          {n.action_url && (
                            <Link
                              href={n.action_url}
                              onClick={() => setShowNotifs(false)}
                              className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold"
                              style={{ color: "#F59E0B" }}
                            >
                              {n.action_label} <ArrowRight size={10} />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 text-center" style={{ borderTop: "1px solid rgba(245,215,160,0.2)" }}>
                <Link
                  href="/alerts"
                  onClick={() => setShowNotifs(false)}
                  className="text-xs font-semibold"
                  style={{ color: "#F59E0B" }}
                >
                  View all alerts →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Avatar + Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => { setShowMenu(v => !v); setShowNotifs(false); }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg transition-colors"
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.15)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
              {username.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-sm font-medium hidden md:block" style={{ color: "#5C4A35" }}>{username}</span>
            <ChevronDown className="w-3.5 h-3.5" style={{ color: "#A8967E" }} />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-full mt-1 w-48 rounded-xl py-1 z-50"
              style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.35)", boxShadow: "0 8px 24px rgba(120,97,78,0.15)" }}
            >
              <div className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                <p className="text-xs font-semibold" style={{ color: "#292524" }}>{username}</p>
                <p className="text-xs" style={{ color: "#C4AA8A" }}>{plan}</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowMenu(false); router.push("/settings"); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors"
                style={{ color: "#78614E" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.12)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <User className="w-3.5 h-3.5" /> My Account
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors"
                style={{ color: "#ef4444" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
