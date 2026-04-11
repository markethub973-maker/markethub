/**
 * Telegram Bot API client.
 *
 * Two strategies:
 *   - Global bot (TELEGRAM_BOT_TOKEN env): the same bot for all users.
 *     We host it, users add it to their group/channel, and we send via
 *     POST /sendMessage with the right chat_id.
 *   - Per-user bot: each agency creates their own bot via @BotFather and
 *     stores the token in channel_integrations table. The send helper
 *     accepts an optional override token.
 *
 * Wave 5 ships with the global bot path. Per-user bots come later when
 * the multi-tenant settings UI is added.
 */

const API_BASE = "https://api.telegram.org";

interface SendResponse {
  ok: boolean;
  message_id?: number;
  error?: string;
  raw?: unknown;
}

function getDefaultToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN ?? null;
}

/**
 * Send a plain or Markdown-formatted message to a Telegram chat.
 *
 * `chatId` can be:
 *   - a positive number (user's personal chat with the bot)
 *   - a negative number (group chat)
 *   - "@channelname" (public channel)
 *
 * `parseMode`:
 *   - "MarkdownV2" — full markdown but with strict escaping
 *   - "HTML" — easier to use, supports <b>, <i>, <a>
 *   - undefined — plain text, no formatting
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options: {
    parseMode?: "MarkdownV2" | "HTML";
    disablePreview?: boolean;
    overrideToken?: string;
  } = {},
): Promise<SendResponse> {
  const token = options.overrideToken ?? getDefaultToken();
  if (!token) return { ok: false, error: "Telegram bot token not configured" };

  const url = `${API_BASE}/bot${token}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: text.slice(0, 4096),
  };
  if (options.parseMode) body.parse_mode = options.parseMode;
  if (options.disablePreview) body.disable_web_page_preview = true;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json()) as {
      ok: boolean;
      result?: { message_id: number };
      description?: string;
      error_code?: number;
    };
    if (!json.ok) {
      return { ok: false, error: json.description ?? `HTTP ${res.status}`, raw: json };
    }
    return { ok: true, message_id: json.result?.message_id, raw: json };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Send a document (PDF) attachment with optional caption. Useful for
 * delivering generated PDF reports directly into Telegram.
 *
 * For Wave 5 we use sendDocument with a remote URL — Telegram fetches
 * the file from our Supabase Storage. No need to upload bytes.
 */
export async function sendTelegramDocument(
  chatId: string | number,
  fileUrl: string,
  caption?: string,
  options: { overrideToken?: string } = {},
): Promise<SendResponse> {
  const token = options.overrideToken ?? getDefaultToken();
  if (!token) return { ok: false, error: "Telegram bot token not configured" };

  const url = `${API_BASE}/bot${token}/sendDocument`;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    document: fileUrl,
  };
  if (caption) body.caption = caption.slice(0, 1024);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as {
      ok: boolean;
      result?: { message_id: number };
      description?: string;
    };
    if (!json.ok) return { ok: false, error: json.description, raw: json };
    return { ok: true, message_id: json.result?.message_id, raw: json };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Verify the bot token by calling /getMe — used by health checks. */
export async function verifyTelegramToken(token?: string): Promise<{
  ok: boolean;
  bot_username?: string;
  bot_id?: number;
  error?: string;
}> {
  const t = token ?? getDefaultToken();
  if (!t) return { ok: false, error: "Telegram bot token not configured" };

  try {
    const res = await fetch(`${API_BASE}/bot${t}/getMe`, {
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json()) as {
      ok: boolean;
      result?: { id: number; username: string; first_name: string };
      description?: string;
    };
    if (!json.ok) return { ok: false, error: json.description };
    return { ok: true, bot_username: json.result?.username, bot_id: json.result?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
