"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Plus, BarChart2, Calendar, Loader2, X,
  Instagram, Mail, User, Activity, Clock,
} from "lucide-react";

interface ClientProfile {
  id: string;
  name: string;
  email: string;
  instagram_handle?: string;
  subscription_plan?: string;
  created_at: string;
  updated_at?: string;
}

export default function ResellerDashboardPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  // Add client form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newInstagram, setNewInstagram] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/reseller/clients");
      if (res.status === 403) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load clients.");
        return;
      }
      setClients(data.clients || []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    if (!newName.trim() || !newEmail.trim()) {
      setAddError("Name and email are required.");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/reseller/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          instagram: newInstagram.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to add client.");
        setAddLoading(false);
        return;
      }
      setNewName("");
      setNewEmail("");
      setNewInstagram("");
      setShowAdd(false);
      fetchClients();
    } catch {
      setAddError("Network error.");
    } finally {
      setAddLoading(false);
    }
  }

  const stats = {
    totalClients: clients.length,
    activeThisMonth: clients.filter((c) => {
      if (!c.updated_at) return false;
      const d = new Date(c.updated_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  };

  function timeAgo(dateStr?: string) {
    if (!dateStr) return "No activity";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg, #FAF8F5)",
        color: "var(--color-text, #2D2015)",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 32,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Reseller Dashboard</h1>
            <p style={{ color: "#78614E", fontSize: 14, marginTop: 4 }}>
              Manage your clients and content production.
            </p>
          </div>
          <button
            className="btn-3d-active"
            onClick={() => setShowAdd(true)}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              border: "none",
            }}
          >
            <Plus className="w-4 h-4" /> Add Client
          </button>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {[
            {
              icon: <Users className="w-5 h-5" />,
              label: "Total Clients",
              value: stats.totalClients,
              color: "#F59E0B",
            },
            {
              icon: <Activity className="w-5 h-5" />,
              label: "Active This Month",
              value: stats.activeThisMonth,
              color: "#16A34A",
            },
            {
              icon: <BarChart2 className="w-5 h-5" />,
              label: "Content Produced",
              value: "\u2014",
              color: "#8B5CF6",
            },
            {
              icon: <Calendar className="w-5 h-5" />,
              label: "Revenue",
              value: "\u2014",
              color: "#E1306C",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "var(--color-surface, #F5F0E8)",
                border: "1px solid var(--color-border, rgba(245,215,160,0.3))",
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                  color: s.color,
                }}
              >
                {s.icon}
                <span style={{ fontSize: 12, fontWeight: 600, color: "#78614E" }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.2)",
              borderRadius: 10,
              padding: "12px 16px",
              color: "#DC2626",
              fontSize: 14,
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 60,
              gap: 8,
              color: "#78614E",
            }}
          >
            <Loader2 className="w-5 h-5 animate-spin" /> Loading clients...
          </div>
        )}

        {/* Clients list */}
        {!loading && clients.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: 60,
              background: "var(--color-surface, #F5F0E8)",
              borderRadius: 16,
              border: "1px solid var(--color-border, rgba(245,215,160,0.3))",
            }}
          >
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>No clients yet</h3>
            <p style={{ color: "#78614E", fontSize: 14, marginBottom: 20 }}>
              Add your first client to get started with content production.
            </p>
            <button
              className="btn-3d-active"
              onClick={() => setShowAdd(true)}
              style={{
                padding: "10px 24px",
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                border: "none",
              }}
            >
              <Plus className="w-4 h-4 inline mr-1" /> Add Client
            </button>
          </div>
        )}

        {!loading && clients.length > 0 && (
          <div style={{ display: "grid", gap: 12 }}>
            {clients.map((c) => (
              <div
                key={c.id}
                style={{
                  background: "var(--color-surface, #F5F0E8)",
                  border: "1px solid var(--color-border, rgba(245,215,160,0.3))",
                  borderRadius: 14,
                  padding: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #F59E0B, #D97706)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#1C1814",
                    fontWeight: 800,
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {(c.name || "?")[0].toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name || "Unnamed"}</div>
                  <div style={{ fontSize: 12, color: "#78614E", display: "flex", alignItems: "center", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Mail className="w-3 h-3" /> {c.email}
                    </span>
                    {c.instagram_handle && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Instagram className="w-3 h-3" /> @{c.instagram_handle}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "#78614E",
                  }}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {timeAgo(c.updated_at || c.created_at)}
                </div>

                {/* Plan badge */}
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    background: "rgba(245,158,11,0.12)",
                    color: "#D97706",
                  }}
                >
                  {c.subscription_plan || "pending"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Add Client Modal */}
        {showAdd && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
              padding: 24,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAdd(false);
            }}
          >
            <div
              style={{
                background: "var(--color-bg, #FAF8F5)",
                borderRadius: 18,
                padding: 32,
                width: "100%",
                maxWidth: 420,
                position: "relative",
              }}
            >
              <button
                onClick={() => setShowAdd(false)}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#78614E",
                }}
              >
                <X className="w-5 h-5" />
              </button>

              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Add New Client</h2>
              <p style={{ color: "#78614E", fontSize: 13, marginBottom: 24 }}>
                Enter your client details to start producing content.
              </p>

              {addError && (
                <div
                  style={{
                    background: "rgba(220,38,38,0.08)",
                    border: "1px solid rgba(220,38,38,0.2)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#DC2626",
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  {addError}
                </div>
              )}

              <form onSubmit={handleAddClient}>
                <label style={{ display: "block", marginBottom: 14 }}>
                  <span
                    style={{
                      fontSize: 12,
                      color: "#78614E",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginBottom: 4,
                    }}
                  >
                    <User className="w-3 h-3" /> Client Name *
                  </span>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Acme Marketing"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "var(--color-surface, #F5F0E8)",
                      border: "1px solid var(--color-border, rgba(245,215,160,0.3))",
                      color: "var(--color-text, #2D2015)",
                      fontSize: 14,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </label>

                <label style={{ display: "block", marginBottom: 14 }}>
                  <span
                    style={{
                      fontSize: 12,
                      color: "#78614E",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginBottom: 4,
                    }}
                  >
                    <Mail className="w-3 h-3" /> Email *
                  </span>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="client@company.com"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "var(--color-surface, #F5F0E8)",
                      border: "1px solid var(--color-border, rgba(245,215,160,0.3))",
                      color: "var(--color-text, #2D2015)",
                      fontSize: 14,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </label>

                <label style={{ display: "block", marginBottom: 24 }}>
                  <span
                    style={{
                      fontSize: 12,
                      color: "#78614E",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginBottom: 4,
                    }}
                  >
                    <Instagram className="w-3 h-3" /> Instagram Handle
                  </span>
                  <input
                    type="text"
                    value={newInstagram}
                    onChange={(e) => setNewInstagram(e.target.value)}
                    placeholder="@clienthandle"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "var(--color-surface, #F5F0E8)",
                      border: "1px solid var(--color-border, rgba(245,215,160,0.3))",
                      color: "var(--color-text, #2D2015)",
                      fontSize: 14,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </label>

                <button
                  type="submit"
                  disabled={addLoading}
                  className="btn-3d-active"
                  style={{
                    width: "100%",
                    padding: "12px 20px",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: addLoading ? "not-allowed" : "pointer",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    opacity: addLoading ? 0.6 : 1,
                  }}
                >
                  {addLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Adding...
                    </>
                  ) : (
                    "Add Client"
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
