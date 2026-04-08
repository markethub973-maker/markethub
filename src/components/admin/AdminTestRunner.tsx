"use client";

import { useState } from "react";
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw,
  Search, Map, Instagram, PlaySquare, MessageSquare, Globe,
  Database, Mail, Youtube, Bot, Zap, ChevronDown, ChevronUp,
} from "lucide-react";

interface TestResult {
  name: string;
  service: string;
  ok: boolean;
  latency: number;
  error?: string;
  warnings?: string[];
  sample?: Record<string, unknown>;
}

interface RunTestsResponse {
  summary: { total: number; passed: number; failed: number; warnings: number };
  passed_all: boolean;
  ran_at: string;
  results: TestResult[];
}

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  apify: <Globe size={15} />,
  anthropic: <Bot size={15} />,
  supabase: <Database size={15} />,
  resend: <Mail size={15} />,
  youtube: <Youtube size={15} />,
  reddit: <MessageSquare size={15} />,
};

const TEST_ICONS: Record<string, React.ReactNode> = {
  "Google Search (Apify)": <Search size={14} />,
  "Google Maps (Apify)": <Map size={14} />,
  "Instagram Hashtag (Apify)": <Instagram size={14} />,
  "TikTok Hashtag (Apify)": <PlaySquare size={14} />,
  "Reddit Search (Apify)": <MessageSquare size={14} />,
  "Local Market site: search (Apify)": <Search size={14} />,
  "Marketing Agent Plan (Anthropic)": <Bot size={14} />,
  "Lead Scoring AI (Anthropic)": <Zap size={14} />,
  "Supabase DB connection": <Database size={14} />,
  "Supabase required tables": <Database size={14} />,
  "Resend Email API": <Mail size={14} />,
  "YouTube Data API": <Youtube size={14} />,
};

function StatusIcon({ ok, warnings }: { ok: boolean; warnings?: string[] }) {
  if (!ok) return <XCircle size={16} className="text-red-400 flex-shrink-0" />;
  if (warnings?.length) return <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0" />;
  return <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />;
}

function TestRow({ result }: { result: TestResult }) {
  const [open, setOpen] = useState(false);
  const hasDetails = result.error || (result.warnings?.length ?? 0) > 0 || result.sample;

  const bg = !result.ok
    ? "rgba(239,68,68,0.06)"
    : result.warnings?.length
    ? "rgba(245,158,11,0.06)"
    : "rgba(34,197,94,0.04)";

  const border = !result.ok
    ? "rgba(239,68,68,0.2)"
    : result.warnings?.length
    ? "rgba(245,158,11,0.2)"
    : "rgba(34,197,94,0.15)";

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => hasDetails && setOpen(o => !o)}
      >
        <StatusIcon ok={result.ok} warnings={result.warnings} />
        <span className="text-gray-400" style={{ minWidth: 14 }}>
          {TEST_ICONS[result.name] ?? <Globe size={14} />}
        </span>
        <span className="flex-1 text-sm font-medium" style={{ color: "#F5F0E8" }}>
          {result.name}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-mono"
          style={{ background: "rgba(255,255,255,0.05)", color: "#A0A0A0" }}
        >
          {result.latency}ms
        </span>
        {hasDetails && (
          <span className="text-gray-500">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
      </div>

      {open && hasDetails && (
        <div className="px-4 pb-3 space-y-2 border-t" style={{ borderColor: border }}>
          {result.error && (
            <p className="text-xs mt-2" style={{ color: "#F87171" }}>
              Error: {result.error}
            </p>
          )}
          {result.warnings?.map((w, i) => (
            <p key={i} className="text-xs" style={{ color: "#FCD34D" }}>
              ⚠ {w}
            </p>
          ))}
          {result.sample && (
            <pre
              className="text-xs rounded-lg p-2 overflow-x-auto"
              style={{ background: "rgba(0,0,0,0.3)", color: "#6EE7B7" }}
            >
              {JSON.stringify(result.sample, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function ServiceGroup({ service, results }: { service: string; results: TestResult[] }) {
  const passed = results.filter(r => r.ok).length;
  const total = results.length;
  const allOk = passed === total && results.every(r => !r.warnings?.length);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-gray-500">{SERVICE_ICONS[service] ?? <Globe size={15} />}</span>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#888" }}>
          {service}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            background: allOk ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            color: allOk ? "#4ADE80" : "#F87171",
          }}
        >
          {passed}/{total}
        </span>
      </div>
      <div className="space-y-2">
        {results.map(r => <TestRow key={r.name} result={r} />)}
      </div>
    </div>
  );
}

export default function AdminTestRunner() {
  const [data, setData] = useState<RunTestsResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const run = async () => {
    setRunning(true);
    setError(null);
    setSessionExpired(false);
    try {
      const res = await fetch("/api/admin/run-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (res.status === 401 || res.status === 403) {
        setSessionExpired(true);
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to run tests");
      } else {
        setData(json);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  // Group results by service
  const grouped: Record<string, TestResult[]> = {};
  if (data?.results) {
    for (const r of data.results) {
      if (!grouped[r.service]) grouped[r.service] = [];
      grouped[r.service].push(r);
    }
  }

  const passedPct = data ? Math.round((data.summary.passed / data.summary.total) * 100) : 0;

  return (
    <div
      className="rounded-2xl p-6"
      style={{ backgroundColor: "#1A1A1A", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold" style={{ color: "#F5F0E8" }}>Integration Test Agent</h3>
          <p className="text-xs mt-0.5" style={{ color: "#888" }}>
            Validates every external service and checks response shapes match UI expectations
          </p>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}
        >
          <RefreshCw size={14} className={running ? "animate-spin" : ""} />
          {running ? "Running…" : "Run Tests"}
        </button>
      </div>

      {/* Running state */}
      {running && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2" style={{ color: "#F59E0B" }}>
            <Clock size={14} />
            <span className="text-sm">Running 12 integration tests — this may take up to 2 minutes…</span>
          </div>
          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full animate-pulse"
              style={{ width: "60%", background: "linear-gradient(90deg, #F59E0B, #F97316)" }}
            />
          </div>
        </div>
      )}

      {/* Session expired */}
      {sessionExpired && (
        <div className="rounded-xl px-4 py-3 mb-4 text-sm space-y-1" style={{ background: "rgba(239,68,68,0.1)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p className="font-semibold">Sesiune admin expirată</p>
          <p style={{ color: "#A0A0A0" }}>
            Cookie-ul admin a expirat (8h max). Re-loghează-te la{" "}
            <a href="/markethub973" className="underline" style={{ color: "#F59E0B" }}>/markethub973</a>{" "}
            apoi apasă din nou Run Tests.
          </p>
        </div>
      )}

      {/* Error */}
      {error && !sessionExpired && (
        <div className="rounded-xl px-4 py-3 mb-4 text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}

      {/* Summary bar */}
      {data && (
        <div className="mb-5 space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-green-400" />
              <span className="text-sm font-medium" style={{ color: "#4ADE80" }}>
                {data.summary.passed} passed
              </span>
            </div>
            {data.summary.failed > 0 && (
              <div className="flex items-center gap-1.5">
                <XCircle size={15} className="text-red-400" />
                <span className="text-sm font-medium" style={{ color: "#F87171" }}>
                  {data.summary.failed} failed
                </span>
              </div>
            )}
            {data.summary.warnings > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-yellow-400" />
                <span className="text-sm font-medium" style={{ color: "#FCD34D" }}>
                  {data.summary.warnings} warnings
                </span>
              </div>
            )}
            <span className="text-xs ml-auto" style={{ color: "#555" }}>
              {new Date(data.ran_at).toLocaleTimeString()}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${passedPct}%`,
                background: passedPct === 100
                  ? "linear-gradient(90deg, #22C55E, #4ADE80)"
                  : passedPct >= 70
                  ? "linear-gradient(90deg, #F59E0B, #FCD34D)"
                  : "linear-gradient(90deg, #EF4444, #F87171)",
              }}
            />
          </div>
          <p className="text-xs" style={{ color: "#666" }}>
            {passedPct}% passing — {data.summary.total} tests total
          </p>
        </div>
      )}

      {/* Results grouped by service */}
      {data && Object.keys(grouped).length > 0 && (
        <div className="space-y-5">
          {Object.entries(grouped).map(([service, results]) => (
            <ServiceGroup key={service} service={service} results={results} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!data && !running && !error && (
        <div className="text-center py-8" style={{ color: "#555" }}>
          <Zap size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Press "Run Tests" to validate all external services</p>
        </div>
      )}
    </div>
  );
}
