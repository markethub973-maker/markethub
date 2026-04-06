/**
 * serviceGuard.ts
 * Wraps all external service calls with timeout, retry and structured error responses.
 * Drop-in replacement — use safeApify / safeAnthropic / safeFetch instead of raw fetch.
 */

export interface ServiceResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  service?: string;
  retries?: number;
}

// ── Generic fetch with timeout ───────────────────────────────────────────────
export async function safeFetch<T = any>(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<ServiceResult<T>> {
  const { timeoutMs = 30_000, ...fetchOpts } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...fetchOpts, signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }

    const data: T = await res.json();
    return { ok: true, data };
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") return { ok: false, error: "Request timed out" };
    return { ok: false, error: err.message || "Network error" };
  }
}

// ── Apify actor call with timeout + retry ────────────────────────────────────
export async function safeApify<T = any>(
  actorId: string,
  input: Record<string, unknown>,
  opts: { timeoutSec?: number; memorySec?: number; retries?: number } = {}
): Promise<ServiceResult<T>> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return { ok: false, service: "apify", error: "APIFY_TOKEN not configured" };

  const { timeoutSec = 60, memorySec = 256, retries = 1 } = opts;
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=${timeoutSec}&memory=${memorySec}`;

  let lastError = "";
  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await safeFetch<T>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      timeoutMs: (timeoutSec + 10) * 1000,
    });

    if (result.ok) return { ...result, retries: attempt };
    lastError = result.error || "Unknown error";

    // Don't retry on auth errors
    if (lastError.includes("401") || lastError.includes("403")) break;

    if (attempt < retries) await sleep(1500 * (attempt + 1));
  }

  return { ok: false, service: "apify", error: lastError };
}

// ── Anthropic call with timeout ──────────────────────────────────────────────
export async function safeAnthropic(
  createFn: () => Promise<any>,
  timeoutMs = 45_000
): Promise<ServiceResult<any>> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, service: "anthropic", error: "ANTHROPIC_API_KEY not configured" };

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ ok: false, service: "anthropic", error: "Anthropic request timed out after 45s" });
    }, timeoutMs);

    createFn()
      .then((data) => {
        clearTimeout(timer);
        resolve({ ok: true, data });
      })
      .catch((err: any) => {
        clearTimeout(timer);
        const msg = err?.error?.error?.message || err?.message || "Anthropic error";
        resolve({ ok: false, service: "anthropic", error: msg });
      });
  });
}

// ── Supabase query with timeout ──────────────────────────────────────────────
export async function safeQuery<T = any>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<ServiceResult<T>> {
  try {
    const { data, error } = await Promise.race([
      queryFn(),
      sleep(10_000).then(() => ({ data: null, error: { message: "Supabase query timed out" } })),
    ]);

    if (error) return { ok: false, service: "supabase", error: error.message };
    return { ok: true, data: data as T };
  } catch (err: any) {
    return { ok: false, service: "supabase", error: err.message };
  }
}

// ── Helper ───────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<any> {
  return new Promise((resolve) => setTimeout(() => resolve({ data: null, error: null }), ms));
}

// ── Structured API error response ───────────────────────────────────────────
export function serviceError(
  service: string,
  message: string,
  status = 503
): Response {
  const body = JSON.stringify({
    error: message,
    service,
    degraded: true,
    retryable: status !== 401 && status !== 403,
  });
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
