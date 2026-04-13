"use client";

/**
 * CRM — Kanban board.
 *
 * Columns = pipeline_stages (configurable per user, auto-seeded on first
 * load with New/Qualified/Proposal/Negotiation/Won/Lost).
 * Cards  = research_leads rows.
 *
 * Drag-drop: native HTML5 draggable + dragover/drop handlers. No
 * react-dnd or react-beautiful-dnd — keeps the bundle tight. Optimistic
 * UI: we move the card locally on drop, fire-and-forget the API call, and
 * revert on failure.
 *
 * Features:
 *   - Horizontal scroll for overflow columns
 *   - Inline "quick add lead" at the top of each column
 *   - Click card → open detail drawer for edit
 *   - Add/rename/delete stages via the column header
 *   - Column stats: lead count + total estimated_value
 */

import { useCallback, useEffect, useState, useRef } from "react";
import {
  Plus,
  ArrowLeft,
  Loader2,
  X,
  Edit3,
  Trash2,
  DollarSign,
  Phone,
  Mail,
  Check,
  Search,
} from "lucide-react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────

interface Stage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  is_terminal: boolean;
}

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  category: string | null;
  source: string | null;
  pipeline_status: string | null;
  pipeline_stage_id: string | null;
  stage_position: number;
  last_activity_at: string;
  estimated_value: number | null;
  close_date: string | null;
  notes: string | null;
  created_at: string;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function CrmPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Quick-add state per stage
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [newLeadName, setNewLeadName] = useState("");

  // Drag-drop state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const dragCount = useRef(0);

  // Selected lead for detail edit
  const [selected, setSelected] = useState<Lead | null>(null);

  // Stage management
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const load = useCallback(async () => {
    try {
      const [sRes, lRes] = await Promise.all([
        fetch("/api/crm/stages", { cache: "no-store" }),
        fetch("/api/crm/leads", { cache: "no-store" }),
      ]);
      if (sRes.ok) {
        const d = await sRes.json();
        setStages(d.stages ?? []);
      }
      if (lRes.ok) {
        const d = await lRes.json();
        setLeads(d.leads ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Lead actions ─────────────────────────────────────────────────────────

  async function addLead(stageId: string) {
    if (!newLeadName.trim()) return;
    const res = await fetch("/api/crm/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_id: stageId, name: newLeadName.trim() }),
    });
    if (res.ok) {
      setNewLeadName("");
      setAddingIn(null);
      await load();
    }
  }

  async function updateLead(id: string, patch: Partial<Lead>) {
    const res = await fetch("/api/crm/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (res.ok) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
      if (selected?.id === id) setSelected({ ...selected, ...patch } as Lead);
    }
  }

  async function deleteLead(id: string) {
    if (!confirm("Delete this lead permanently?")) return;
    const res = await fetch("/api/crm/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setLeads((prev) => prev.filter((l) => l.id !== id));
      if (selected?.id === id) setSelected(null);
    }
  }

  // ── Stage actions ────────────────────────────────────────────────────────

  async function addStage() {
    const name = prompt("New stage name:");
    if (!name?.trim()) return;
    const res = await fetch("/api/crm/stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) await load();
  }

  async function saveStageName(id: string) {
    if (!editingName.trim()) {
      setEditingStage(null);
      return;
    }
    await fetch("/api/crm/stages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: editingName.trim() }),
    });
    setEditingStage(null);
    await load();
  }

  async function deleteStage(id: string) {
    if (!confirm("Delete this column? Leads will be moved to 'No stage'.")) return;
    await fetch("/api/crm/stages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  // ── Drag-drop ────────────────────────────────────────────────────────────

  function onDragStart(e: React.DragEvent, leadId: string) {
    setDraggingId(leadId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", leadId);
  }

  function onDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStage !== stageId) setDragOverStage(stageId);
  }

  function onDragEnter(_e: React.DragEvent) {
    dragCount.current++;
  }

  function onDragLeave(_e: React.DragEvent) {
    dragCount.current--;
    if (dragCount.current <= 0) {
      dragCount.current = 0;
      setDragOverStage(null);
    }
  }

  async function onDrop(e: React.DragEvent, stageId: string, beforeLeadId?: string) {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    setDraggingId(null);
    setDragOverStage(null);
    dragCount.current = 0;
    if (!leadId) return;

    // Determine target position
    const stageLeads = leads
      .filter((l) => l.pipeline_stage_id === stageId && l.id !== leadId)
      .sort((a, b) => a.stage_position - b.stage_position);
    let targetPos = stageLeads.length;
    if (beforeLeadId) {
      const idx = stageLeads.findIndex((l) => l.id === beforeLeadId);
      if (idx >= 0) targetPos = idx;
    }

    // Optimistic local move
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, pipeline_stage_id: stageId, stage_position: targetPos } : l,
      ),
    );

    // Fire API
    const res = await fetch("/api/crm/leads/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: leadId, stage_id: stageId, position: targetPos }),
    });
    if (!res.ok) {
      // Revert on failure
      await load();
    } else {
      // Refetch to sync positions everywhere
      await load();
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const filteredLeads = search
    ? leads.filter(
        (l) =>
          l.name.toLowerCase().includes(search.toLowerCase()) ||
          l.email?.toLowerCase().includes(search.toLowerCase()) ||
          l.phone?.toLowerCase().includes(search.toLowerCase()),
      )
    : leads;

  const leadsByStage = new Map<string | null, Lead[]>();
  for (const l of filteredLeads) {
    const key = l.pipeline_stage_id;
    if (!leadsByStage.has(key)) leadsByStage.set(key, []);
    leadsByStage.get(key)!.push(l);
  }
  for (const arr of leadsByStage.values()) {
    arr.sort((a, b) => a.stage_position - b.stage_position);
  }

  const unstaged = leadsByStage.get(null) ?? [];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", color: "#292524" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 24px",
          borderBottom: "1px solid rgba(245,215,160,0.25)",
          background: "#FFFCF7",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: "rgba(245,158,11,0.08)",
            borderRadius: 6,
            color: "#F59E0B",
            textDecoration: "none",
            fontSize: 12,
          }}
        >
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#A8967E", letterSpacing: 1.5, textTransform: "uppercase" }}>
            CRM
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Pipeline Kanban</h1>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: "white",
            border: "1px solid rgba(245,215,160,0.3)",
            borderRadius: 8,
          }}
        >
          <Search size={12} style={{ color: "#A8967E" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            style={{
              border: "none",
              outline: "none",
              fontSize: 12,
              background: "transparent",
              width: 180,
              color: "#292524",
            }}
          />
        </div>
        <button
          onClick={addStage}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            background: "#F59E0B",
            color: "#1C1814",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Plus size={14} /> Add column
        </button>
      </div>

      {/* Kanban board (horizontal scroll) */}
      <div
        style={{
          display: "flex",
          gap: 14,
          padding: 20,
          overflowX: "auto",
          minHeight: "calc(100vh - 73px)",
        }}
      >
        {loading && stages.length === 0 && (
          <div style={{ width: "100%", textAlign: "center", color: "#A8967E", padding: 50 }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 10px" }} />
            Loading Kanban...
          </div>
        )}

        {/* Unstaged column (only if there are unstaged leads) */}
        {unstaged.length > 0 && (
          <KanbanColumn
            stage={{
              id: "null",
              name: "No stage",
              color: "#A8967E",
              position: -1,
              is_default: false,
              is_terminal: false,
            }}
            leads={unstaged}
            draggingId={draggingId}
            dragOver={dragOverStage === "null"}
            addingIn={addingIn}
            newLeadName={newLeadName}
            editingStage={editingStage}
            editingName={editingName}
            setEditingStage={setEditingStage}
            setEditingName={setEditingName}
            setAddingIn={setAddingIn}
            setNewLeadName={setNewLeadName}
            saveStageName={saveStageName}
            onAddLead={addLead}
            onDeleteStage={deleteStage}
            onSelectLead={setSelected}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            isUnstaged
          />
        )}

        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={leadsByStage.get(stage.id) ?? []}
            draggingId={draggingId}
            dragOver={dragOverStage === stage.id}
            addingIn={addingIn}
            newLeadName={newLeadName}
            editingStage={editingStage}
            editingName={editingName}
            setEditingStage={setEditingStage}
            setEditingName={setEditingName}
            setAddingIn={setAddingIn}
            setNewLeadName={setNewLeadName}
            saveStageName={saveStageName}
            onAddLead={addLead}
            onDeleteStage={deleteStage}
            onSelectLead={setSelected}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          />
        ))}
      </div>

      {/* Lead detail drawer */}
      {selected && (
        <LeadDetailDrawer
          lead={selected}
          stages={stages}
          onClose={() => setSelected(null)}
          onUpdate={updateLead}
          onDelete={deleteLead}
        />
      )}
    </div>
  );
}

// ── Kanban Column ───────────────────────────────────────────────────────────

function KanbanColumn(props: {
  stage: Stage;
  leads: Lead[];
  draggingId: string | null;
  dragOver: boolean;
  addingIn: string | null;
  newLeadName: string;
  editingStage: string | null;
  editingName: string;
  setEditingStage: (id: string | null) => void;
  setEditingName: (n: string) => void;
  setAddingIn: (id: string | null) => void;
  setNewLeadName: (n: string) => void;
  saveStageName: (id: string) => void;
  onAddLead: (stageId: string) => void;
  onDeleteStage: (id: string) => void;
  onSelectLead: (lead: Lead) => void;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageId: string, beforeLeadId?: string) => void;
  isUnstaged?: boolean;
}) {
  const {
    stage,
    leads,
    draggingId,
    dragOver,
    addingIn,
    newLeadName,
    editingStage,
    editingName,
    setEditingStage,
    setEditingName,
    setAddingIn,
    setNewLeadName,
    saveStageName,
    onAddLead,
    onDeleteStage,
    onSelectLead,
    onDragStart,
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDrop,
    isUnstaged,
  } = props;

  const totalValue = leads.reduce((s, l) => s + (l.estimated_value ?? 0), 0);

  return (
    <div
      style={{
        minWidth: 280,
        width: 280,
        background: dragOver ? "rgba(245,158,11,0.08)" : "#F5EFE4",
        borderRadius: 12,
        padding: 12,
        transition: "background 150ms",
        borderTop: `3px solid ${stage.color}`,
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 120px)",
      }}
      onDragOver={(e) => onDragOver(e, stage.id)}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, stage.id)}
    >
      {/* Column header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: stage.color }} />
        {editingStage === stage.id ? (
          <input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={() => saveStageName(stage.id)}
            onKeyDown={(e) => e.key === "Enter" && saveStageName(stage.id)}
            autoFocus
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 700,
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 4,
              padding: "4px 6px",
              outline: "none",
              background: "white",
              color: "#292524",
            }}
          />
        ) : (
          <h3
            onDoubleClick={() => {
              if (!isUnstaged) {
                setEditingStage(stage.id);
                setEditingName(stage.name);
              }
            }}
            style={{
              fontSize: 13,
              fontWeight: 700,
              margin: 0,
              flex: 1,
              cursor: isUnstaged ? "default" : "text",
              color: "#292524",
            }}
          >
            {stage.name}
          </h3>
        )}
        <span
          style={{
            fontSize: 10,
            padding: "1px 7px",
            borderRadius: 10,
            background: "rgba(168,150,126,0.2)",
            color: "#78614E",
            fontWeight: 700,
          }}
        >
          {leads.length}
        </span>
        {!isUnstaged && !stage.is_default && (
          <button
            onClick={() => onDeleteStage(stage.id)}
            style={{
              background: "transparent",
              border: "none",
              color: "#A8967E",
              cursor: "pointer",
              padding: 2,
            }}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {totalValue > 0 && (
        <div
          style={{
            fontSize: 10,
            color: "#78614E",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <DollarSign size={10} /> ${totalValue.toLocaleString()} estimated
        </div>
      )}

      {/* Quick add */}
      {!isUnstaged && addingIn === stage.id && (
        <div
          style={{
            padding: 10,
            background: "white",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 8,
            marginBottom: 8,
          }}
        >
          <input
            value={newLeadName}
            onChange={(e) => setNewLeadName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onAddLead(stage.id);
              if (e.key === "Escape") {
                setAddingIn(null);
                setNewLeadName("");
              }
            }}
            placeholder="Lead name..."
            autoFocus
            style={{
              width: "100%",
              padding: 6,
              border: "1px solid rgba(245,215,160,0.3)",
              borderRadius: 4,
              fontSize: 12,
              outline: "none",
              background: "white",
              color: "#292524",
            }}
          />
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            <button
              onClick={() => onAddLead(stage.id)}
              style={{
                flex: 1,
                padding: "4px 8px",
                background: "#F59E0B",
                color: "#1C1814",
                border: "none",
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Add
            </button>
            <button
              onClick={() => {
                setAddingIn(null);
                setNewLeadName("");
              }}
              style={{
                padding: "4px 8px",
                background: "rgba(168,150,126,0.1)",
                color: "#78614E",
                border: "none",
                borderRadius: 4,
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              <X size={10} />
            </button>
          </div>
        </div>
      )}

      {/* Leads list */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
        {leads.map((lead) => (
          <div
            key={lead.id}
            draggable
            onDragStart={(e) => onDragStart(e, lead.id)}
            onClick={() => onSelectLead(lead)}
            onDrop={(e) => {
              e.stopPropagation();
              onDrop(e, stage.id, lead.id);
            }}
            style={{
              padding: 10,
              background: "white",
              borderRadius: 8,
              border: "1px solid rgba(245,215,160,0.25)",
              boxShadow: "0 1px 3px rgba(120,97,78,0.06)",
              cursor: "grab",
              opacity: draggingId === lead.id ? 0.4 : 1,
              transition: "opacity 150ms",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#292524",
                marginBottom: 4,
              }}
            >
              {lead.name}
            </div>
            {lead.city && (
              <div style={{ fontSize: 10, color: "#A8967E" }}>{lead.city}</div>
            )}
            {lead.estimated_value != null && lead.estimated_value > 0 && (
              <div
                style={{
                  fontSize: 10,
                  color: "#10B981",
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                ${lead.estimated_value.toLocaleString()}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 6, fontSize: 10, color: "#78614E" }}>
              {lead.email && <Mail size={10} />}
              {lead.phone && <Phone size={10} />}
              <span style={{ marginLeft: "auto" }}>
                {new Date(lead.last_activity_at).toLocaleDateString("ro-RO", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick add trigger */}
      {!isUnstaged && addingIn !== stage.id && (
        <button
          onClick={() => setAddingIn(stage.id)}
          style={{
            marginTop: 8,
            padding: 8,
            background: "transparent",
            border: "1px dashed rgba(168,150,126,0.4)",
            borderRadius: 6,
            color: "#78614E",
            fontSize: 11,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            justifyContent: "center",
          }}
        >
          <Plus size={12} /> Lead nou
        </button>
      )}
    </div>
  );
}

// ── Lead Detail Drawer ──────────────────────────────────────────────────────

function LeadDetailDrawer({
  lead,
  stages,
  onClose,
  onUpdate,
  onDelete,
}: {
  lead: Lead;
  stages: Stage[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Lead>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState(lead.name);
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [website, setWebsite] = useState(lead.website ?? "");
  const [city, setCity] = useState(lead.city ?? "");
  const [estimatedValue, setEstimatedValue] = useState(lead.estimated_value?.toString() ?? "");
  const [closeDate, setCloseDate] = useState(lead.close_date ?? "");
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [saving, setSaving] = useState(false);

  const currentStage = stages.find((s) => s.id === lead.pipeline_stage_id);

  async function save() {
    setSaving(true);
    await onUpdate(lead.id, {
      name,
      phone: phone || null,
      email: email || null,
      website: website || null,
      city: city || null,
      estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
      close_date: closeDate || null,
      notes: notes || null,
    });
    setSaving(false);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 400,
        background: "white",
        borderLeft: "1px solid rgba(245,215,160,0.3)",
        boxShadow: "-4px 0 16px rgba(120,97,78,0.1)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(245,215,160,0.25)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              color: "#A8967E",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Lead detail
          </div>
          {currentStage && (
            <div
              style={{
                display: "inline-block",
                padding: "2px 8px",
                background: `${currentStage.color}18`,
                color: currentStage.color,
                borderRadius: 10,
                fontSize: 10,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              {currentStage.name}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "rgba(168,150,126,0.1)",
            border: "none",
            borderRadius: 6,
            padding: 6,
            cursor: "pointer",
            color: "#78614E",
          }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Website">
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="City">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Estimated value ($)">
          <input
            type="number"
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Estimated close date">
          <input
            type="date"
            value={closeDate}
            onChange={(e) => setCloseDate(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </Field>
      </div>

      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid rgba(245,215,160,0.25)",
          display: "flex",
          gap: 10,
        }}
      >
        <button
          onClick={save}
          disabled={saving}
          style={{
            flex: 1,
            padding: "10px 16px",
            background: "#F59E0B",
            color: "#1C1814",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 12,
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Save
        </button>
        <button
          onClick={() => onDelete(lead.id)}
          style={{
            padding: "10px 12px",
            background: "rgba(239,68,68,0.08)",
            color: "#B91C1C",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid rgba(245,215,160,0.3)",
  borderRadius: 6,
  fontSize: 12,
  outline: "none",
  fontFamily: "inherit",
  background: "white",
  color: "#292524",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 10,
          color: "#78614E",
          letterSpacing: 1,
          textTransform: "uppercase",
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
