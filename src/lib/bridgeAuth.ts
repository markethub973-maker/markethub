import { NextRequest, NextResponse } from "next/server";

/**
 * Bridge API authentication middleware.
 * Validates Bearer token from zurio-app against MARKETHUB_BRIDGE_TOKEN.
 * Returns userId extraction if token is valid, or error response.
 */
export function bridgeAuth(req: NextRequest): { ok: true } | { ok: false; response: NextResponse } {
  const token = process.env.MARKETHUB_BRIDGE_TOKEN;
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "Bridge not configured" }, { status: 503 }) };
  }

  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return { ok: false, response: NextResponse.json({ error: "Missing Bearer token" }, { status: 401 }) };
  }

  const provided = auth.slice(7);
  if (provided !== token) {
    return { ok: false, response: NextResponse.json({ error: "Invalid bridge token" }, { status: 403 }) };
  }

  return { ok: true };
}
