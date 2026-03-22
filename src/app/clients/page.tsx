"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Users, Plus, Trash2, AlertCircle, CheckCircle2, Instagram, ChevronDown, ChevronUp, Info, Copy } from "lucide-react";

const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const IG = "#E1306C";

const SQL_MIGRATION = `CREATE TABLE IF NOT EXISTS client_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  instagram_username TEXT,
  instagram_user_id TEXT NOT NULL,
  instagram_access_token TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own clients" ON client_accounts
  FOR ALL USING (auth.uid() = user_id);`;

type Client = {
  id: string;
  client_name: string;
  instagram_username: string;
  instagram_user_id: string;
  created_at: string;
  notes?: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsMigration, setNeedsMigration] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSQL, setShowSQL] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    client_name: "",
    instagram_user_id: "",
    instagram_access_token: "",
    notes: "",
  });

  const loadClients = () => {
    setLoading(true);
    fetch("/api/clients")
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setClients(d.clients || []);
      })
      .catch(() => setError("Eroare de rețea"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadClients(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    setSuccessMsg("");
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.error) {
      setFormError(data.error);
      if (data.migration) setNeedsMigration(true);
    } else {
      setSuccessMsg(`@${data.username} adăugat cu succes (${data.followers?.toLocaleString()} urmăritori)`);
      setForm({ client_name: "", instagram_user_id: "", instagram_access_token: "", notes: "" });
      setShowForm(false);
      loadClients();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Ștergi contul "${name}"?`)) return;
    await fetch(`/api/clients?id=${id}`, { method: "DELETE" });
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const copySQL = () => {
    navigator.clipboard.writeText(SQL_MIGRATION);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  };

  return (
    <div>
      <Header title="Multi-Cont Clienți" subtitle="Gestionează mai multe conturi Instagram pentru agenția ta" />
      <div className="p-6 space-y-5">

        {/* Migration banner */}
        {needsMigration && (
          <div className="rounded-xl p-5" style={{ ...cardStyle, border: "1px solid rgba(245,158,11,0.3)", backgroundColor: "rgba(245,158,11,0.04)" }}>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
              <div className="flex-1">
                <p className="text-sm font-semibold mb-1" style={{ color: "#292524" }}>Setup necesar — tabel Supabase</p>
                <p className="text-sm mb-3" style={{ color: "#78614E" }}>
                  Rulează migrarea de mai jos în <strong>Supabase → SQL Editor</strong> pentru a activa funcționalitatea multi-cont.
                </p>
                <button type="button" onClick={() => setShowSQL(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg mb-2"
                  style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.25)" }}>
                  {showSQL ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showSQL ? "Ascunde SQL" : "Arată SQL"}
                </button>
                {showSQL && (
                  <div className="relative">
                    <pre className="text-xs p-3 rounded-lg overflow-x-auto" style={{ backgroundColor: "#1C1814", color: "#F5D7A0" }}>
                      {SQL_MIGRATION}
                    </pre>
                    <button type="button" onClick={copySQL}
                      className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                      style={{ backgroundColor: "rgba(245,158,11,0.2)", color: "#F59E0B" }}>
                      <Copy className="w-3 h-3" />
                      {sqlCopied ? "Copiat!" : "Copiază"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Header actions */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: "#78614E" }}>
              {clients.length === 0 ? "Niciun client adăugat încă" : `${clients.length} cont${clients.length !== 1 ? "uri" : ""} client`}
            </p>
          </div>
          <button type="button" onClick={() => { setShowForm(v => !v); setFormError(""); setSuccessMsg(""); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
            style={{ backgroundColor: IG, color: "white" }}>
            <Plus className="w-4 h-4" />
            Adaugă Client
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="rounded-xl p-5" style={cardStyle}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#292524" }}>Adaugă cont client Instagram</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Nume client *</label>
                  <input type="text" placeholder="Ex: Brand XYZ SRL" required
                    value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none"
                    style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFFCF7", color: "#292524" }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Instagram User ID *</label>
                  <input type="text" placeholder="Ex: 17841400008460056" required
                    value={form.instagram_user_id} onChange={e => setForm(f => ({ ...f, instagram_user_id: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none"
                    style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFFCF7", color: "#292524" }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Access Token Instagram *</label>
                <input type="password" placeholder="EAABsb..." required
                  value={form.instagram_access_token} onChange={e => setForm(f => ({ ...f, instagram_access_token: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFFCF7", color: "#292524" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Note (opțional)</label>
                <input type="text" placeholder="Ex: client nou, contract 2025..."
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFFCF7", color: "#292524" }} />
              </div>

              {/* Info box */}
              <div className="rounded-lg p-3 flex items-start gap-2" style={{ backgroundColor: "rgba(245,215,160,0.1)", border: "1px solid rgba(245,215,160,0.25)" }}>
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
                <p className="text-xs" style={{ color: "#78614E" }}>
                  Obține Instagram User ID și Access Token conectând contul clientului prin Meta Business Suite.
                  Tokenul trebuie să aibă permisiunile: <code>instagram_basic</code>, <code>instagram_manage_insights</code>, <code>pages_show_list</code>.
                </p>
              </div>

              {formError && (
                <p className="text-xs font-semibold" style={{ color: "#EF4444" }}>{formError}</p>
              )}

              <div className="flex gap-3">
                <button type="submit" disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: IG, color: "white", opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? "Se verifică..." : "Adaugă client"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
                  Anulează
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Success */}
        {successMsg && (
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ ...cardStyle, border: "1px solid rgba(29,185,84,0.3)", backgroundColor: "rgba(29,185,84,0.05)" }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: "#1DB954" }} />
            <p className="text-sm font-semibold" style={{ color: "#1DB954" }}>{successMsg}</p>
          </div>
        )}

        {/* Error */}
        {error && !needsMigration && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={cardStyle}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
            <p className="text-sm" style={{ color: "#EF4444" }}>{error}</p>
          </div>
        )}

        {/* Clients list */}
        {loading ? (
          <div className="rounded-xl p-12 text-center" style={cardStyle}>
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm" style={{ color: "#A8967E" }}>Se încarcă...</p>
          </div>
        ) : clients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clients.map(client => (
              <div key={client.id} className="rounded-xl p-5" style={cardStyle}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "rgba(225,48,108,0.1)" }}>
                      <Instagram className="w-5 h-5" style={{ color: IG }} />
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: "#292524" }}>{client.client_name}</p>
                      {client.instagram_username && (
                        <a href={`https://instagram.com/${client.instagram_username}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs hover:underline" style={{ color: IG }}>
                          @{client.instagram_username}
                        </a>
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={() => handleDelete(client.id, client.client_name)}
                    className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                    style={{ color: "#EF4444", backgroundColor: "rgba(239,68,68,0.08)" }}
                    title="Șterge client">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {client.notes && (
                  <p className="text-xs" style={{ color: "#A8967E" }}>{client.notes}</p>
                )}
                <p className="text-xs mt-2" style={{ color: "#C4AA8A" }}>
                  Adăugat {new Date(client.created_at).toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          !error && (
            <div className="rounded-xl p-12 text-center" style={cardStyle}>
              <Users className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(225,48,108,0.25)" }} />
              <p className="font-semibold text-lg mb-2" style={{ color: "#292524" }}>Niciun client adăugat</p>
              <p className="text-sm max-w-sm mx-auto" style={{ color: "#A8967E" }}>
                Adaugă conturile Instagram Business ale clienților tăi pentru a gestiona și analiza toate datele dintr-un singur loc.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
