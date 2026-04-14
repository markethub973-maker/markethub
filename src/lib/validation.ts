/**
 * Centralised zod schemas for validating request bodies.
 *
 * Why a central module:
 *  - Schemas are reused across endpoints (e.g. support/tickets + consultant
 *    both take a "message" field with same constraints)
 *  - Error shapes stay consistent — 422 with { error: "...", issues: [...] }
 *  - Easier to audit: grep this file to see every accepted input shape
 *
 * Endpoints that parse arbitrary user input should call `parseBody(schema, req)`
 * and return its `error` NextResponse on failure. Rate-limited endpoints
 * (AI tier especially) get an extra layer of protection: even if rate limit
 * lets a request through, bad-shape payloads die here at 422 instead of
 * blowing up downstream and spending tokens on an invalid Haiku call.
 */

import { z } from "zod";
import { NextResponse } from "next/server";

// ── Reusable primitives ──────────────────────────────────────────────────

const NonEmptyString = (max: number) => z.string().trim().min(1).max(max);
const Uuid = z.string().uuid();
const Email = z.string().trim().toLowerCase().email().max(254);
const UrlHttps = z.string().trim().url().refine((u) => u.startsWith("https://"), {
  message: "Must be https URL",
});
const LangCode = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]{2}(-[a-z]{2,3})?$/, { message: "Invalid language code" });

// ── Per-endpoint schemas ─────────────────────────────────────────────────

export const ConsultantChatSchema = z.object({
  message: NonEmptyString(2000),
  session_id: NonEmptyString(128).optional(),
  page_url: z.string().url().max(512).optional(),
  form_state: z.record(z.string(), z.unknown()).optional(),
  recent_events: z.array(z.string().max(200)).max(20).optional(),
});
export type ConsultantChatBody = z.infer<typeof ConsultantChatSchema>;

export const SupportTicketSchema = z.object({
  message: NonEmptyString(5000),
  subject: NonEmptyString(200).optional(),
  email: Email.optional(),
  page_url: z.string().url().max(512).optional(),
  browser_info: z.string().max(500).optional(),
  screenshot_url: UrlHttps.optional(),
});
export type SupportTicketBody = z.infer<typeof SupportTicketSchema>;

export const N8NTriggerSchema = z.object({
  template_slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/, {
      message: "Invalid slug format",
    }),
  inputs: z.record(z.string(), z.unknown()).default({}),
});
export type N8NTriggerBody = z.infer<typeof N8NTriggerSchema>;

export const LearningIssueCreateSchema = z.object({
  category: z.enum([
    "bug",
    "client_question",
    "token_expiry",
    "api_error",
    "payment",
    "onboarding",
    "feature_request",
    "security",
    "other",
  ]),
  symptom: NonEmptyString(2000),
  solution: NonEmptyString(4000),
  root_cause: z.string().max(2000).optional().nullable(),
  platform: z.string().max(50).optional().nullable(),
  error_code: z.string().max(50).optional().nullable(),
  language: LangCode.optional(),
  resolution_time_minutes: z.number().int().min(0).max(10_000_000).optional().nullable(),
});
export type LearningIssueCreateBody = z.infer<typeof LearningIssueCreateSchema>;

export const LearningSearchSchema = z.object({
  q: NonEmptyString(500),
  category: z.string().max(50).optional(),
  platform: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});
export type LearningSearchQuery = z.infer<typeof LearningSearchSchema>;

export const Admin2FAEnrollConfirmSchema = z.object({
  secret_b32: z
    .string()
    .trim()
    .regex(/^[A-Z2-7]{16,64}$/, { message: "Invalid base32 secret" }),
  code: z.string().trim().regex(/^[0-9]{6}$/, { message: "Code must be 6 digits" }),
});

export const Admin2FADisableSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^([0-9]{6}|[a-f0-9]{10})$/i, { message: "Invalid code format" }),
});

// ── Helper ───────────────────────────────────────────────────────────────

export interface ParseSuccess<T> {
  ok: true;
  data: T;
}
export interface ParseFailure {
  ok: false;
  response: NextResponse;
}

/**
 * Validate a request body (or any object) against a schema. On failure,
 * returns a ready-to-return NextResponse with 422 + issue details.
 *
 * Usage:
 *   const parsed = await parseBody(req, SupportTicketSchema);
 *   if (!parsed.ok) return parsed.response;
 *   const body = parsed.data; // typed + validated
 */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<ParseSuccess<T> | ParseFailure> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      ),
    };
  }
  const r = schema.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  return {
    ok: false,
    response: NextResponse.json(
      {
        error: "Validation failed",
        issues: r.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 422 },
    ),
  };
}

/**
 * Validate URL search params against a schema (useful for GET endpoints).
 */
export function parseSearchParams<T>(
  params: URLSearchParams,
  schema: z.ZodType<T>,
): ParseSuccess<T> | ParseFailure {
  const obj: Record<string, string> = {};
  params.forEach((v, k) => {
    obj[k] = v;
  });
  const r = schema.safeParse(obj);
  if (r.success) return { ok: true, data: r.data };
  return {
    ok: false,
    response: NextResponse.json(
      {
        error: "Invalid query parameters",
        issues: r.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 422 },
    ),
  };
}
