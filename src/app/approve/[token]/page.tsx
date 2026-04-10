"use client";
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2, Clock, MessageSquare } from "lucide-react";

export default function ApprovalPage() {
  const { token } = useParams() as { token: string };
  const searchParams = useSearchParams();
  const actionParam = searchParams.get("action");

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/calendar/approval?token=${token}`)
      .then(r => r.json())
      .then(d => { if (d.post) setPost(d.post); else setError("Link invalid sau expirat."); })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (actionParam && post && !done && post.approval_status === "pending") {
      handleAction(actionParam as "approve" | "reject");
    }
  }, [actionParam, post]);

  const handleAction = async (action: "approve" | "reject") => {
    setActing(true);
    const res = await fetch("/api/calendar/approval", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action, note }),
    });
    const d = await res.json();
    if (d.ok) setDone(action === "approve" ? "approved" : "rejected");
    else setError(d.error || "Eroare");
    setActing(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FAFAF8" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F59E0B" }} />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FAFAF8" }}>
      <div className="text-center p-8">
        <XCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "#EF4444" }} />
        <p className="font-bold text-lg" style={{ color: "#292524" }}>{error}</p>
      </div>
    </div>
  );

  const isAlreadyActed = post?.approval_status === "approved" || post?.approval_status === "rejected";

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#FAFAF8" }}>
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <h1 className="font-bold text-xl" style={{ color: "#292524" }}>MarketHub Pro</h1>
          <p className="text-sm mt-1" style={{ color: "#A8967E" }}>Aprobare conținut</p>
        </div>

        {/* Result */}
        {(done || isAlreadyActed) && (
          <div className="rounded-2xl p-8 text-center mb-4"
            style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.3)" }}>
            {(done === "approved" || post?.approval_status === "approved") ? (
              <>
                <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: "#10B981" }} />
                <h2 className="text-xl font-bold mb-2" style={{ color: "#10B981" }}>Conținut aprobat!</h2>
                <p className="text-sm" style={{ color: "#78614E" }}>Mulțumim! Conținutul a fost aprobat și va fi publicat conform planificării.</p>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 mx-auto mb-4" style={{ color: "#EF4444" }} />
                <h2 className="text-xl font-bold mb-2" style={{ color: "#EF4444" }}>Conținut respins</h2>
                <p className="text-sm" style={{ color: "#78614E" }}>Am înregistrat feedbackul tău. Echipa noastră va reveni cu o variantă nouă.</p>
              </>
            )}
          </div>
        )}

        {/* Post preview */}
        {post && !done && !isAlreadyActed && (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.3)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: "#F59E0B" }} />
                <span className="text-sm font-medium" style={{ color: "#292524" }}>
                  {post.platform} · {post.scheduled_for ? new Date(post.scheduled_for).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" }) : "Draft"}
                </span>
              </div>
            </div>

            {post.image_url && (
              <img src={post.image_url} alt="" className="w-full" style={{ maxHeight: 300, objectFit: "cover" }} />
            )}

            <div className="p-5">
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#292524" }}>{post.content}</p>
            </div>

            {/* Note field */}
            <div className="px-5 pb-5">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-3.5 h-3.5" style={{ color: "#A8967E" }} />
                <label className="text-xs font-medium" style={{ color: "#78614E" }}>Notă (opțional)</label>
              </div>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Adaugă un comentariu sau sugestie..."
                rows={2} className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "#292524" }} />
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-5 pb-5">
              <button type="button" onClick={() => handleAction("approve")} disabled={acting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                style={{ backgroundColor: "#10B981", color: "white" }}>
                {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Aprobă
              </button>
              <button type="button" onClick={() => handleAction("reject")} disabled={acting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                style={{ backgroundColor: "#EF4444", color: "white" }}>
                {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Respinge
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
