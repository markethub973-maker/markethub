"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FolderItem { label: string; icon: string; iconBg: string; iconColor: string; path: string; }
interface Folder { id: string; title: string; subtitle: string; barColor: string; defaultOpen: boolean; items: FolderItem[]; }

const FOLDERS: Folder[] = [
  {
    id: "business", title: "Business & Users", subtitle: "Administrare, Support, Users, Revenue, Test",
    barColor: "#f59e0b", defaultOpen: true,
    items: [
      { label: "Administrare Business", icon: "🏢", path: "/dashboard/admin/business", iconBg: "rgba(245,158,11,0.15)", iconColor: "#fbbf24" },
      { label: "Support Tickets", icon: "🎫", path: "/dashboard/admin/support", iconBg: "rgba(239,68,68,0.15)", iconColor: "#fca5a5" },
      { label: "Users", icon: "👤", path: "/dashboard/admin/users", iconBg: "rgba(168,85,247,0.15)", iconColor: "#c4b5fd" },
      { label: "Revenue Chart", icon: "📊", path: "/dashboard/admin/revenue", iconBg: "rgba(16,185,129,0.15)", iconColor: "#6ee7b7" },
      { label: "Test Accounts", icon: "🧪", path: "/dashboard/admin/test-accounts", iconBg: "rgba(59,130,246,0.15)", iconColor: "#93c5fd" },
    ],
  },
  {
    id: "billing", title: "Billing, Plans & API", subtitle: "Pricing, Feature Flags, Discount Codes, API, Connect",
    barColor: "#10b981", defaultOpen: false,
    items: [
      { label: "Pricing", icon: "💳", path: "/dashboard/admin/pricing", iconBg: "rgba(16,185,129,0.15)", iconColor: "#6ee7b7" },
      { label: "Feature Flags", icon: "⚡", path: "/dashboard/admin/feature-flags", iconBg: "rgba(245,158,11,0.15)", iconColor: "#fbbf24" },
      { label: "Discount Codes", icon: "🏷", path: "/dashboard/admin/discount-codes", iconBg: "rgba(239,68,68,0.15)", iconColor: "#fca5a5" },
      { label: "API Tokens", icon: "🔑", path: "/dashboard/admin/api-tokens", iconBg: "rgba(59,130,246,0.15)", iconColor: "#93c5fd" },
      { label: "Credentials", icon: "⚙", path: "/dashboard/admin/credentials", iconBg: "rgba(245,158,11,0.15)", iconColor: "#fbbf24" },
    ],
  },
];

function FolderAccordion({ folder }: { folder: Folder }) {
  const [open, setOpen] = useState(folder.defaultOpen);
  const router = useRouter();
  return (
    <div className="folder-accordion">
      <div style={{ position: "absolute", inset: 0, zIndex: 0, borderRadius: "inherit", backdropFilter: "blur(18px) saturate(180%)", WebkitBackdropFilter: "blur(18px) saturate(180%)" }} />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, borderRadius: "inherit", background: open ? "rgba(245,158,11,0.05)" : "rgba(255,255,255,0.04)", border: `1px solid ${open ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.09)"}`, transition: "all 0.3s" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", zIndex: 2, borderRadius: "14px 14px 60% 60%/14px 14px 22px 22px", background: "linear-gradient(180deg,rgba(255,255,255,0.07) 0%,transparent 100%)", pointerEvents: "none" }} />
      <div className="folder-head" onClick={() => setOpen((v) => !v)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="folder-color-bar" style={{ background: folder.barColor }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>{folder.title}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{folder.subtitle}</div>
          </div>
        </div>
        <div className={`folder-chevron ${open ? "open" : ""}`}>▶</div>
      </div>
      <div className={`folder-body ${open ? "expanded" : ""}`}>
        <div className="folder-items">
          {folder.items.map((item) => (
            <div key={item.path} className="folder-item" onClick={() => router.push(item.path)}>
              <div className="folder-item-icon" style={{ background: item.iconBg, color: item.iconColor }}>{item.icon}</div>
              <span className="folder-item-label">{item.label}</span>
              <span className="folder-item-arrow">→</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Zone4_Tools() {
  return (
    <div>
      <div className="zone-label">🗂 Zone 4 — Management Tools</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {FOLDERS.map((f) => <FolderAccordion key={f.id} folder={f} />)}
      </div>
    </div>
  );
}
