/**
 * Brain Command Center — Revenue Pipeline
 * Lists every outreach_log row with status, reply/FU timestamps.
 */

import { createServiceClient } from "@/lib/supabase/service";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import MarkRepliedButton from "@/components/brain/MarkRepliedButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Row {
  id: number;
  created_at: string;
  domain: string;
  email: string;
  language: string | null;
  subject: string | null;
  status: string;
  replied_at: string | null;
  follow_up_1_sent_at: string | null;
  follow_up_2_sent_at: string | null;
}

function statusColor(r: Row): string {
  if (r.replied_at) return "#10B981";       // green
  if (r.status !== "sent") return "#EF4444"; // red
  if (r.follow_up_2_sent_at) return "#6B7280"; // gray — exhausted
  if (r.follow_up_1_sent_at) return "#F59E0B"; // amber — on nudge
  return "#3B82F6"; // blue — sent, waiting
}

function statusLabel(r: Row): string {
  if (r.replied_at) return "REPLIED";
  if (r.status !== "sent") return r.status.toUpperCase();
  if (r.follow_up_2_sent_at) return "FU2 sent";
  if (r.follow_up_1_sent_at) return "FU1 sent";
  return "SENT";
}

export default async function Pipeline() {
  const svc = createServiceClient();
  const { data } = await svc
    .from("outreach_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as Row[];
  const totals = {
    all: rows.length,
    replied: rows.filter((r) => r.replied_at).length,
    fu1: rows.filter((r) => r.follow_up_1_sent_at && !r.replied_at).length,
    fu2: rows.filter((r) => r.follow_up_2_sent_at && !r.replied_at).length,
    pending: rows.filter((r) => r.status === "sent" && !r.replied_at && !r.follow_up_1_sent_at).length,
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#0F0F14",
        color: "white",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center gap-3">
        <Link
          href="/"
          className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md"
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#bbb",
          }}
        >
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div>
          <p className="text-sm font-semibold">Pipeline</p>
          <p className="text-xs" style={{ color: "#888" }}>
            Last 100 outreach rows — {totals.all} total · {totals.replied} replied ·{" "}
            {totals.fu1} at FU1 · {totals.fu2} at FU2 · {totals.pending} waiting
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-16">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: "#1A1A24", color: "#888" }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs uppercase">Domain</th>
                <th className="text-left px-4 py-3 text-xs uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs uppercase">Lang</th>
                <th className="text-left px-4 py-3 text-xs uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs uppercase">Sent</th>
                <th className="text-left px-4 py-3 text-xs uppercase">FU1</th>
                <th className="text-left px-4 py-3 text-xs uppercase">FU2</th>
                <th className="text-left px-4 py-3 text-xs uppercase">Reply</th>
                <th className="text-left px-4 py-3 text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center" style={{ color: "#666" }}>
                    No outreach yet. <Link href="/outreach" style={{ color: "#F59E0B" }}>Send a batch</Link>.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  style={{
                    backgroundColor: i % 2 === 0 ? "#14141B" : "#1A1A24",
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <td className="px-4 py-2 font-semibold">{r.domain}</td>
                  <td className="px-4 py-2" style={{ color: "#bbb" }}>{r.email}</td>
                  <td className="px-4 py-2 uppercase text-xs" style={{ color: "#888" }}>{r.language ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{
                        backgroundColor: statusColor(r) + "22",
                        color: statusColor(r),
                        border: `1px solid ${statusColor(r)}44`,
                      }}
                    >
                      {statusLabel(r)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs" style={{ color: "#888" }}>{(r.created_at || "").slice(5, 16).replace("T"," ")}</td>
                  <td className="px-4 py-2 text-xs" style={{ color: "#888" }}>{(r.follow_up_1_sent_at || "").slice(5, 16).replace("T"," ") || "—"}</td>
                  <td className="px-4 py-2 text-xs" style={{ color: "#888" }}>{(r.follow_up_2_sent_at || "").slice(5, 16).replace("T"," ") || "—"}</td>
                  <td className="px-4 py-2 text-xs" style={{ color: "#888" }}>{(r.replied_at || "").slice(5, 16).replace("T"," ") || "—"}</td>
                  <td className="px-4 py-2">
                    <MarkRepliedButton id={r.id} alreadyReplied={Boolean(r.replied_at)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs mt-4" style={{ color: "#666" }}>
          FU1 auto-sent after 3 days · FU2 after 7 days · Marked REPLIED when a reply is manually logged.
          Reply tracking automation — sprint 2 (inbound Resend webhook).
        </p>
      </main>
    </div>
  );
}
