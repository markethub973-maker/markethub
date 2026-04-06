"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ShieldX, Mail } from "lucide-react";

function BlockedContent() {
  const params = useSearchParams();
  const reason = params.get("reason")
    ? decodeURIComponent(params.get("reason")!)
    : "Your account has been suspended due to a violation of our Terms of Service.";

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #FFF8F0 0%, #FFF3E0 100%)" }}>
      <div className="max-w-md w-full rounded-2xl p-8 text-center shadow-lg"
        style={{ backgroundColor: "#fff", border: "1px solid rgba(239,68,68,0.2)" }}>
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(239,68,68,0.1)" }}>
            <ShieldX size={32} style={{ color: "#EF4444" }} />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#292524" }}>
          Account Suspended
        </h1>
        <p className="text-sm mb-6" style={{ color: "#78716C" }}>
          {reason}
        </p>
        <div className="rounded-xl p-4 mb-6 text-left"
          style={{ backgroundColor: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "#EF4444" }}>
            Why was my account suspended?
          </p>
          <p className="text-xs" style={{ color: "#78716C" }}>
            Our system detected multiple free accounts associated with the same person.
            Each user is allowed one free trial. To continue using MarketHub Pro,
            please upgrade to a paid plan with your main account.
          </p>
        </div>
        <a
          href="mailto:support@markethubpro.com"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all"
          style={{ backgroundColor: "#F59E0B", color: "#fff" }}
        >
          <Mail size={16} />
          Contact Support
        </a>
        <p className="text-xs mt-4" style={{ color: "#A8A29E" }}>
          If you believe this is an error, please contact our support team.
        </p>
      </div>
    </div>
  );
}

export default function BlockedPage() {
  return (
    <Suspense>
      <BlockedContent />
    </Suspense>
  );
}
