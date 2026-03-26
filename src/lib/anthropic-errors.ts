/**
 * Maps Anthropic API errors to user-friendly messages.
 * Used in /api/captions and /api/agent routes.
 */

export interface AIErrorResponse {
  error: string;
  error_code: string;
  retryable: boolean;
}

export function getAnthropicErrorResponse(err: any): AIErrorResponse {
  const status = err?.status ?? err?.statusCode ?? 0;
  const type = err?.error?.type ?? err?.type ?? "";
  const message: string = err?.message ?? "";

  // ── Credits exhausted / billing issue ──────────────────────────────────
  if (
    status === 402 ||
    type === "credit_balance_too_low" ||
    message.toLowerCase().includes("credit") ||
    message.toLowerCase().includes("billing") ||
    message.toLowerCase().includes("balance")
  ) {
    return {
      error: "🤖 AI is temporarily unavailable — service is being recharged. Please try again in a few minutes or contact support if the issue persists.",
      error_code: "ai_credits_exhausted",
      retryable: false,
    };
  }

  // ── Rate limit ──────────────────────────────────────────────────────────
  if (status === 429 || type === "rate_limit_error") {
    return {
      error: "🤖 AI is busy right now — too many requests at once. Please wait 30 seconds and try again.",
      error_code: "ai_rate_limited",
      retryable: true,
    };
  }

  // ── Server overloaded ───────────────────────────────────────────────────
  if (status === 529 || type === "overloaded_error") {
    return {
      error: "🤖 AI servers are currently overloaded. Please try again in 1–2 minutes.",
      error_code: "ai_overloaded",
      retryable: true,
    };
  }

  // ── Authentication / invalid API key ───────────────────────────────────
  if (status === 401 || type === "authentication_error") {
    return {
      error: "🤖 AI service configuration error. Please contact support.",
      error_code: "ai_auth_error",
      retryable: false,
    };
  }

  // ── Permission error ────────────────────────────────────────────────────
  if (status === 403 || type === "permission_error") {
    return {
      error: "🤖 AI feature not available on your current plan. Please upgrade to access this feature.",
      error_code: "ai_permission_error",
      retryable: false,
    };
  }

  // ── Invalid request ─────────────────────────────────────────────────────
  if (status === 400 || type === "invalid_request_error") {
    return {
      error: "🤖 Could not process your request. Please try rephrasing your input.",
      error_code: "ai_invalid_request",
      retryable: false,
    };
  }

  // ── Server error ────────────────────────────────────────────────────────
  if (status >= 500 || type === "api_error") {
    return {
      error: "🤖 AI service is temporarily unavailable. Please try again in a few minutes.",
      error_code: "ai_server_error",
      retryable: true,
    };
  }

  // ── Fallback ────────────────────────────────────────────────────────────
  return {
    error: "🤖 AI temporarily unavailable. Please try again in a few minutes.",
    error_code: "ai_unknown_error",
    retryable: true,
  };
}
