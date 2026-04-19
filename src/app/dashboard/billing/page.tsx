"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { CreditCard, Download, CheckCircle, XCircle, Clock, AlertTriangle, Zap, ExternalLink, Ban } from "lucide-react";
import Link from "next/link";

interface Invoice {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string | null;
  date: string;
  pdf: string | null;
  period_start: string;
  period_end: string;
}

interface PaymentMethod {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface Subscription {
  current_period_end: string;
  cancel_at_period_end: boolean;
  status: string;
}

interface BillingData {
  plan: string;
  status: string;
  trial_expires_at: string | null;
  invoices: Invoice[];
  payment_method: PaymentMethod | null;
  subscription: Subscription | null;
}

const PLAN_LABELS: Record<string, string> = {
  free_test: "Starter",
  lite: "Creator",
  pro: "Pro",
  business: "Studio",
  agency: "Agency",
  expired: "Expired",
};

const CARD_BRAND_ICONS: Record<string, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
  discover: "DISC",
};

function StatusBadge({ status }: { status: string | null }) {
  if (status === "paid") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#16a34a" }}>
      <CheckCircle className="w-3 h-3" /> Paid
    </span>
  );
  if (status === "open") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "var(--color-primary-hover)" }}>
      <Clock className="w-3 h-3" /> Open
    </span>
  );
  if (status === "void" || status === "uncollectible") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#dc2626" }}>
      <XCircle className="w-3 h-3" /> {status === "void" ? "Void" : "Failed"}
    </span>
  );
  return <span className="text-xs" style={{ color: "#A8967E" }}>{status ?? "—"}</span>;
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const openPortal = async () => {
    setActionLoading(true);
    setActionMsg("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
      else setActionMsg(d.error ?? "Could not open portal.");
    } catch {
      setActionMsg("Network error.");
    } finally {
      setActionLoading(false);
    }
  };

  const cancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel? Your plan stays active until the end of the current billing period.")) return;
    setActionLoading(true);
    setActionMsg("");
    try {
      const res = await fetch("/api/stripe/cancel", { method: "POST" });
      const d = await res.json();
      if (d.ok) {
        setData((prev) => prev ? { ...prev, subscription: prev.subscription ? { ...prev.subscription, cancel_at_period_end: true } : null } : prev);
        setActionMsg("Subscription will cancel at the end of the current period.");
      } else {
        setActionMsg(d.error ?? "Could not cancel subscription.");
      }
    } catch {
      setActionMsg("Network error.");
    } finally {
      setActionLoading(false);
    }
  };

  const reactivateSubscription = async () => {
    setActionLoading(true);
    setActionMsg("");
    try {
      const res = await fetch("/api/stripe/cancel", { method: "DELETE" });
      const d = await res.json();
      if (d.ok) {
        setData((prev) => prev ? { ...prev, subscription: prev.subscription ? { ...prev.subscription, cancel_at_period_end: false } : null } : prev);
        setActionMsg("Subscription reactivated — will renew as normal.");
      } else {
        setActionMsg(d.error ?? "Could not reactivate.");
      }
    } catch {
      setActionMsg("Network error.");
    } finally {
      setActionLoading(false);
    }
  };

  const plan = data?.plan ?? "free_test";
  const isExpired = plan === "expired" || data?.status === "expired";
  const isTrial = plan === "free_test";
  const planLabel = PLAN_LABELS[plan] ?? plan;

  return (
    <div>
      <Header title="Billing" subtitle="Payment history and subscription management" />

      <div className="p-6 max-w-2xl space-y-5">

        {loading && (
          <div className="rounded-2xl p-6 animate-pulse" style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)" }}>
            <div className="h-5 w-1/3 rounded mb-3" style={{ backgroundColor: "rgba(245,215,160,0.4)" }} />
            <div className="h-3 w-1/2 rounded" style={{ backgroundColor: "rgba(245,215,160,0.3)" }} />
          </div>
        )}

        {!loading && data && (
          <>
            {/* Plan + subscription status */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: isExpired
                  ? "rgba(239,68,68,0.04)"
                  : "linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,215,160,0.15))",
                border: isExpired
                  ? "1px solid rgba(239,68,68,0.2)"
                  : "1px solid rgba(245,215,160,0.35)",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#A8967E" }}>Current Plan</p>
                  <h2 className="text-2xl font-black" style={{ color: "var(--color-text)" }}>{planLabel}</h2>
                </div>
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={
                    isExpired
                      ? { backgroundColor: "rgba(239,68,68,0.1)", color: "#dc2626" }
                      : { backgroundColor: "rgba(34,197,94,0.1)", color: "#16a34a" }
                  }
                >
                  {isExpired ? "Expired" : "Active"}
                </span>
              </div>

              {data.subscription && !isTrial && (
                <div className="space-y-1.5 mb-4 text-sm" style={{ color: "#78614E" }}>
                  <p>Next renewal: <strong style={{ color: "var(--color-text)" }}>{data.subscription.current_period_end}</strong></p>
                  {data.subscription.cancel_at_period_end && (
                    <div className="flex items-center gap-1.5 text-sm" style={{ color: "#dc2626" }}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Cancels at end of current period
                    </div>
                  )}
                </div>
              )}

              {isTrial && data.trial_expires_at && (
                <p className="text-sm mb-4" style={{ color: "var(--color-primary-hover)" }}>
                  Trial expires: <strong>{new Date(data.trial_expires_at).toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" })}</strong>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/upgrade"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                  style={{ backgroundColor: "var(--color-primary)", color: "#1C1814" }}
                >
                  <Zap className="w-4 h-4" />
                  {isExpired ? "Reactivate" : isTrial ? "Upgrade Now" : "Change Plan"}
                </Link>

                {!isTrial && !isExpired && (
                  <button
                    type="button"
                    onClick={openPortal}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                    style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E", border: "1px solid rgba(245,215,160,0.3)" }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Manage Payment
                  </button>
                )}

                {!isTrial && !isExpired && data?.subscription && !data.subscription.cancel_at_period_end && (
                  <button
                    type="button"
                    onClick={cancelSubscription}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                    style={{ backgroundColor: "rgba(239,68,68,0.06)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}
                  >
                    <Ban className="w-4 h-4" />
                    Cancel Plan
                  </button>
                )}

                {!isTrial && !isExpired && data?.subscription?.cancel_at_period_end && (
                  <button
                    type="button"
                    onClick={reactivateSubscription}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                    style={{ backgroundColor: "rgba(34,197,94,0.08)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.25)" }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Reactivate Plan
                  </button>
                )}
              </div>

              {actionMsg && (
                <p className="mt-3 text-sm" style={{ color: actionMsg.includes("cancel") || actionMsg.includes("error") || actionMsg.includes("Could") ? "#dc2626" : "#16a34a" }}>
                  {actionMsg}
                </p>
              )}
            </div>

            {/* Payment method */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                <span className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>Payment Method</span>
              </div>

              {data.payment_method ? (
                <div className="flex items-center gap-3">
                  <div
                    className="px-2.5 py-1 rounded text-xs font-black"
                    style={{ backgroundColor: "var(--color-surface-dark)", color: "var(--color-primary)", letterSpacing: 1 }}
                  >
                    {CARD_BRAND_ICONS[data.payment_method.brand] ?? data.payment_method.brand.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                      •••• •••• •••• {data.payment_method.last4}
                    </p>
                    <p className="text-xs" style={{ color: "#A8967E" }}>
                      Expires {String(data.payment_method.exp_month).padStart(2, "0")}/{data.payment_method.exp_year}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: "#A8967E" }}>No payment method on file.</p>
              )}
            </div>

            {/* Invoice history */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)" }}
            >
              <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(245,215,160,0.2)" }}>
                <span className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>Payment History</span>
              </div>

              {data.invoices.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm" style={{ color: "#A8967E" }}>No invoices yet.</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "rgba(245,215,160,0.15)" }}>
                  {data.invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-4 px-6 py-3.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>
                          {inv.period_start} — {inv.period_end}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{inv.date}</p>
                      </div>
                      <StatusBadge status={inv.status} />
                      <span className="text-sm font-bold w-16 text-right" style={{ color: "var(--color-text)" }}>
                        ${inv.amount.toFixed(2)}
                      </span>
                      {inv.pdf ? (
                        <a
                          href={inv.pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold hover:opacity-70 transition-opacity"
                          style={{ color: "var(--color-primary)" }}
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </a>
                      ) : (
                        <span className="w-12" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Support note */}
            <p className="text-xs text-center" style={{ color: "#C4AA8A" }}>
              Questions about billing?{" "}
              <a href="mailto:support@markethubpromo.com" className="underline" style={{ color: "var(--color-primary)" }}>
                support@markethubpromo.com
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
