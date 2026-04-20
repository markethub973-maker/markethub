/**
 * Master Kill Switch — disables all Alex operations and API-consuming crons.
 * 
 * Set KILL_SWITCH=true in env or just leave this file as-is.
 * When active, all brain/ and cron/ routes that consume external API credits
 * return immediately with {paused: true}.
 * 
 * Reactivation: set ALEX_ENABLED=true in Vercel env vars
 * or delete this kill switch check from routes.
 */

import { NextResponse } from "next/server";

export function isAlexPaused(): boolean {
  // If ALEX_ENABLED is explicitly set to "true", allow operations
  if (process.env.ALEX_ENABLED === "true") return false;
  // Otherwise, everything is paused
  return true;
}

export function pausedResponse(reason?: string) {
  return NextResponse.json({
    paused: true,
    reason: reason || "All Alex operations paused — social media publishing not yet functional. Set ALEX_ENABLED=true to reactivate.",
  });
}
