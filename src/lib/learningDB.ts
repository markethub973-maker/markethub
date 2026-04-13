/**
 * Learning DB helpers — M5 Sprint 1
 *
 * Lightweight lib to save & search resolved issues. Used by:
 *  - M4 support tickets (when admin marks resolved, save the resolution)
 *  - M9 consultant (before replying, check for similar past answers)
 *  - Weekly digest cron
 */

import { createServiceClient } from "@/lib/supabase/service";

export interface ResolvedIssueInput {
  category:
    | "bug"
    | "client_question"
    | "token_expiry"
    | "api_error"
    | "payment"
    | "onboarding"
    | "feature_request"
    | "security"
    | "other";
  symptom: string;
  root_cause?: string | null;
  solution: string;
  platform?: string | null;
  error_code?: string | null;
  language?: string;
  source?: "manual" | "ticket" | "consultant" | "auto";
  source_ref?: string | null;
  auto_resolved?: boolean;
  resolution_time_minutes?: number | null;
  created_by?: string | null;
}

export async function saveResolvedIssue(input: ResolvedIssueInput): Promise<string | null> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("resolved_issues")
    .insert({
      category: input.category,
      symptom: input.symptom,
      root_cause: input.root_cause ?? null,
      solution: input.solution,
      platform: input.platform ?? null,
      error_code: input.error_code ?? null,
      language: input.language ?? "en",
      source: input.source ?? "manual",
      source_ref: input.source_ref ?? null,
      auto_resolved: input.auto_resolved ?? false,
      resolution_time_minutes: input.resolution_time_minutes ?? null,
      created_by: input.created_by ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return (data.id as string) ?? null;
}

export interface ResolvedIssueMatch {
  id: string;
  category: string;
  symptom: string;
  solution: string;
  platform: string | null;
  usage_count: number;
  created_at: string;
}

/**
 * Extract search terms from a free-text query — punctuation stripped,
 * lowercased, ≥3 chars only, max 8 terms. Exported for unit testing.
 */
export function extractSearchTerms(query: string): string[] {
  const q = query.trim();
  if (!q || q.length < 3) return [];
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3)
    .slice(0, 8);
}

/**
 * Simple keyword / full-text search. Uses to_tsvector index on the
 * concat of symptom+root_cause+solution. Returns up to `limit` matches
 * ordered by rank.
 */
export async function searchResolvedIssues(
  query: string,
  opts: { category?: string; platform?: string; limit?: number } = {},
): Promise<ResolvedIssueMatch[]> {
  const terms = extractSearchTerms(query);
  if (terms.length === 0) return [];

  const service = createServiceClient();
  // websearch_to_tsquery uses literal " OR " for disjunction (not "|").
  const tsquery = terms.join(" OR ");

  let builder = service
    .from("resolved_issues")
    .select("id,category,symptom,solution,platform,usage_count,created_at")
    .textSearch("symptom", tsquery, { type: "websearch", config: "simple" })
    .order("usage_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 5);
  if (opts.category) builder = builder.eq("category", opts.category);
  if (opts.platform) builder = builder.eq("platform", opts.platform);

  const { data, error } = await builder;

  // FTS only scans `symptom`. If it returns nothing (term only appears in
  // solution/root_cause), fall through to ILIKE across both columns.
  if (!error && data && data.length > 0) {
    return data as ResolvedIssueMatch[];
  }

  let ilike = service
    .from("resolved_issues")
    .select("id,category,symptom,solution,platform,usage_count,created_at")
    .or(
      terms
        .map((t) => `symptom.ilike.%${t}%,solution.ilike.%${t}%,root_cause.ilike.%${t}%`)
        .join(","),
    )
    .order("usage_count", { ascending: false })
    .limit(opts.limit ?? 5);
  if (opts.category) ilike = ilike.eq("category", opts.category);
  if (opts.platform) ilike = ilike.eq("platform", opts.platform);
  const { data: fb } = await ilike;
  return (fb ?? []) as ResolvedIssueMatch[];
}

/** Bump usage_count when a stored solution is surfaced. */
export async function markIssueUsed(id: string): Promise<void> {
  const service = createServiceClient();
  const { data } = await service
    .from("resolved_issues")
    .select("usage_count")
    .eq("id", id)
    .maybeSingle();
  const curr = (data?.usage_count as number | undefined) ?? 0;
  await service
    .from("resolved_issues")
    .update({ usage_count: curr + 1 })
    .eq("id", id);
}
