"use client";
import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import { Plus, Trash2, Mail, Shield, Eye, Edit3, Loader2, Check, X, Users } from "lucide-react";

interface Member { id: string; member_email: string; role: string; status: string; invited_at: string; accepted_at: string | null; }

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", borderRadius: 12 };
const inp: React.CSSProperties = { border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "#292524", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none" };
const ROLES = [{ id: "admin", label: "Admin", icon: Shield, color: "#EF4444", desc: "Acces complet" }, { id: "editor", label: "Editor", icon: Edit3, color: "#F59E0B", desc: "Poate edita conținut" }, { id: "viewer", label: "Viewer", icon: Eye, color: "#6366F1", desc: "Doar citire" }];
const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = { invited: { bg: "rgba(245,158,11,0.1)", color: "#F59E0B", label: "Invitat" }, active: { bg: "rgba(16,185,129,0.1)", color: "#10B981", label: "Activ" }, suspended: { bg: "rgba(239,68,68,0.08)", color: "#EF4444", label: "Suspendat" } };

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/team").then(r => r.json()).then(d => { if (d.members) setMembers(d.members); }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const invite = async () => {
    if (!email.trim()) return;
    setInviting(true); setError("");
    const res = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), role }) });
    const d = await res.json();
    if (d.member) { setMembers(p => [d.member, ...p]); setEmail(""); }
    else setError(d.error || "Eroare la invitație");
    setInviting(false);
  };

  const changeRole = async (id: string, newRole: string) => {
    const res = await fetch("/api/team", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, role: newRole }) });
    const d = await res.json();
    if (d.member) setMembers(p => p.map(m => m.id === id ? d.member : m));
  };

  const remove = async (id: string) => {
    if (!confirm("Elimini membrul din echipă?")) return;
    await fetch("/api/team", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setMembers(p => p.filter(m => m.id !== id));
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }}>
      <Header title="Team Collaboration" subtitle="Invită membri în echipă și gestionează rolurile" />
      <div className="p-4 max-w-3xl mx-auto space-y-4">

        {/* Invite form */}
        <div className="rounded-2xl p-4 space-y-3" style={card}>
          <p className="font-bold text-sm" style={{ color: "#292524" }}>Invită un membru nou</p>
          <div className="flex gap-2 flex-wrap">
            <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && invite()}
              placeholder="email@exemplu.com" style={{ ...inp, flex: 1, minWidth: 200 }} />
            <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inp, minWidth: 120 }}>
              {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <button type="button" onClick={invite} disabled={inviting || !email.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Invită
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Role legend */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {ROLES.map(r => { const Icon = r.icon; return (
              <div key={r.id} className="rounded-lg p-2 flex items-center gap-2"
                style={{ backgroundColor: `${r.color}08`, border: `1px solid ${r.color}20` }}>
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: r.color }} />
                <div><p className="text-xs font-semibold" style={{ color: r.color }}>{r.label}</p><p className="text-[10px]" style={{ color: "#A8967E" }}>{r.desc}</p></div>
              </div>
            );})}
          </div>
        </div>

        {/* Members list */}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#F59E0B" }} /></div>
        ) : members.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={card}>
            <Users className="w-8 h-8 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
            <p className="text-sm" style={{ color: "#78614E" }}>Niciun membru invitat încă</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map(m => {
              const st = STATUS_COLORS[m.status] ?? STATUS_COLORS.invited;
              const roleInfo = ROLES.find(r => r.id === m.role) ?? ROLES[1];
              const RoleIcon = roleInfo.icon;
              return (
                <div key={m.id} className="rounded-xl px-4 py-3 flex items-center gap-3" style={card}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
                    {m.member_email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "#292524" }}>{m.member_email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                  </div>
                  <select value={m.role} onChange={e => changeRole(m.id, e.target.value)}
                    className="text-xs rounded-lg px-2 py-1.5 outline-none"
                    style={{ border: `1px solid ${roleInfo.color}30`, backgroundColor: `${roleInfo.color}08`, color: roleInfo.color }}>
                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <button type="button" onClick={() => remove(m.id)}
                    className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
