"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  name?: string;           // Module name shown in error UI
  fallback?: React.ReactNode; // Custom fallback
  minimal?: boolean;       // Compact error UI (for small widgets)
}

interface State {
  hasError: boolean;
  error: string;
}

/**
 * ModuleBoundary — React Error Boundary that isolates UI modules.
 * If a child component throws, this shows a contained error UI
 * instead of crashing the entire page.
 *
 * Usage:
 *   <ModuleBoundary name="Research Hub">
 *     <ResearchPage />
 *   </ModuleBoundary>
 */
export class ModuleBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message || "Unknown error" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production this could send to an error tracking service
    console.error(`[ModuleBoundary:${this.props.name || "unknown"}]`, error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: "" });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    if (this.props.minimal) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#EF4444" }}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1">{this.props.name || "Module"} temporarily unavailable</span>
          <button type="button" onClick={this.reset}
            className="flex items-center gap-1 font-bold opacity-70 hover:opacity-100">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      );
    }

    return (
      <div className="rounded-2xl p-6 flex flex-col items-center gap-4 text-center"
        style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(239,68,68,0.2)" }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "rgba(239,68,68,0.08)" }}>
          <AlertTriangle className="w-6 h-6" style={{ color: "#EF4444" }} />
        </div>
        <div>
          <p className="font-bold text-base" style={{ color: "#292524" }}>
            {this.props.name ? `${this.props.name} unavailable` : "Module unavailable"}
          </p>
          <p className="text-sm mt-1" style={{ color: "#A8967E" }}>
            An unexpected error occurred. The rest of the app keeps working normally.
          </p>
          {this.state.error && (
            <p className="text-xs mt-2 font-mono px-3 py-1.5 rounded-lg inline-block"
              style={{ backgroundColor: "rgba(239,68,68,0.05)", color: "#EF4444" }}>
              {this.state.error.slice(0, 120)}
            </p>
          )}
        </div>
        <button type="button" onClick={this.reset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.25)" }}>
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </div>
    );
  }
}

/**
 * useServiceState — hook for handling async service calls with error/loading state.
 * Prevents uncaught promise rejections from crashing the component.
 */
export function useServiceCall<T>() {
  const [state, setState] = React.useState<{
    loading: boolean;
    error: string | null;
    data: T | null;
    degraded: boolean;
  }>({ loading: false, error: null, data: null, degraded: false });

  const call = React.useCallback(async (fn: () => Promise<Response>) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const res = await fn();
      const json = await res.json();

      if (!res.ok || json.error) {
        const errMsg = json.error || `HTTP ${res.status}`;
        setState({ loading: false, error: errMsg, data: null, degraded: json.degraded || false });
        return null;
      }

      setState({ loading: false, error: null, data: json, degraded: false });
      return json as T;
    } catch (err: any) {
      setState({ loading: false, error: err.message || "Network error", data: null, degraded: false });
      return null;
    }
  }, []);

  return { ...state, call };
}

/**
 * ServiceErrorBanner — inline error UI for API errors inside components.
 * Shows error with retry button, doesn't crash the page.
 */
export function ServiceErrorBanner({
  error,
  service,
  onRetry,
  degraded,
}: {
  error: string;
  service?: string;
  onRetry?: () => void;
  degraded?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
      style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
      <div className="flex-1">
        <p className="font-semibold" style={{ color: "#292524" }}>
          {service ? `${service} unavailable` : "Service error"}
          {degraded && <span className="ml-2 text-xs font-normal" style={{ color: "#A8967E" }}>(degraded service)</span>}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{error}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry}
          className="flex items-center gap-1 text-xs font-bold flex-shrink-0"
          style={{ color: "#F59E0B" }}>
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      )}
    </div>
  );
}
