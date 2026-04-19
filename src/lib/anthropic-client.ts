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

/**
 * Global output safety rules — MUST be appended to every system prompt
 * that generates client-facing content (outreach, pitch, landing page,
 * social posts, email templates).
 *
 * Imported and used by all agents automatically.
 */
export const OUTPUT_SAFETY_RULES = `

MANDATORY OUTPUT RULES (apply to ALL responses, no exceptions):
- NEVER mention: zone, tier, emerging, southeast, premium, ultra, region, or any geographic pricing reference.
- NEVER mention: AI, AI-powered, machine learning, Claude, GPT, Anthropic, OpenAI, Fal.ai, Apify, Supabase, Vercel, Stripe, Resend, Contabo, n8n, Sentry, ElevenLabs, or any internal tool name.
- NEVER reveal that prices differ by country/zone. The price shown is simply "the price".
- If generating client-facing content (emails, pitches, landing pages, social posts): expose ONLY the result, NEVER the system behind it.
- Match the platform format: LinkedIn connection max 300 chars, Instagram DM max 150 chars, email max 200 words, TikTok max 100 chars.
- NEVER copy-paste the same message to multiple prospects. Always personalize.
`;
