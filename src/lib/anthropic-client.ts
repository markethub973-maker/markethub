/**
 * Anthropic client factory — uses two separate API keys:
 *
 *  ANTHROPIC_API_KEY      → development / Claude Code / programming
 *  ANTHROPIC_API_KEY_APP  → application features (agents, captions) — independent credits
 *
 * All user-facing AI features use ANTHROPIC_API_KEY_APP so that development
 * usage never drains the app's credits and vice-versa.
 *
 * If ANTHROPIC_API_KEY_APP is not set, falls back to ANTHROPIC_API_KEY
 * (with a console warning so you know it's happening).
 */

import Anthropic from "@anthropic-ai/sdk";

let _appClient: Anthropic | null = null;

/** Returns the Anthropic client for user-facing app features */
export function getAppAnthropicClient(): Anthropic {
  if (_appClient) return _appClient;

  const appKey = process.env.ANTHROPIC_API_KEY_APP;
  const devKey = process.env.ANTHROPIC_API_KEY;

  if (appKey) {
    _appClient = new Anthropic({ apiKey: appKey });
    return _appClient;
  }

  // Fallback with warning
  if (devKey) {
    console.warn(
      "[MarketHub] ⚠️  ANTHROPIC_API_KEY_APP not set — falling back to ANTHROPIC_API_KEY.\n" +
      "   Set a separate key in .env.local to isolate app credits from dev credits."
    );
    _appClient = new Anthropic({ apiKey: devKey });
    return _appClient;
  }

  throw new Error(
    "No Anthropic API key configured. Set ANTHROPIC_API_KEY_APP in .env.local"
  );
}

/** Returns the app API key string (for inline Anthropic() instantiation) */
export function getAppApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY_APP ?? process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("No Anthropic API key configured.");
  return key;
}
