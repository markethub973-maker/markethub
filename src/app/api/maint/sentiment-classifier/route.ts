/**
 * Maintenance Agent — Sentiment Classifier.
 *
 * Scans social_messages with sentiment IS NULL (newly ingested rows that
 * haven't been classified yet), batches them in groups of up to 10, and
 * asks Claude Haiku 4.5 to classify each as positive/negative/neutral
 * with a confidence score in [-1, 1].
 *
 * Idempotent — re-runs are safe because it only touches NULL rows.
 * Cost: ~$0.001 per batch of 10 messages = ~$0.03/month for 1000
 * messages/day. Bounded run time via maxDuration.
 *
 * Auth: Bearer CRON_SECRET. Invoked by:
 *   - Hourly cron via GH Actions (added to maintenance-agents.yml)
 *   - Inline call from /api/engagement/sync after fetching new comments
 *   - Manual run via Cockpit assistant tool
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { getAppAnthropicClient } from "@/lib/anthropic-client";
import { reportFinding, autoResolveStale } from "@/lib/maintenanceAgent";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const AGENT_NAME = "sentiment-classifier";
const MODEL = "claude-haiku-4-5-20251001";
const BATCH_SIZE = 10;
const MAX_BATCHES_PER_RUN = 20; // 200 messages / run
const MIN_CONFIDENCE_FOR_PRIORITY_BUMP = 0.6;

interface MessageRow {
  id: string;
  user_id: string;
  platform: string;
  content: string;
  author_handle: string | null;
}

interface ClassificationResult {
  id: string;
  sentiment: "positive" | "negative" | "neutral";
  score: number; // -1 to 1
  reason: string;
}

const SYSTEM_PROMPT = `You are a sentiment classification engine for social media DMs and comments on a marketing agency platform.

For each message you receive in the input list, return a JSON object with:
  - id: the message id (passed through)
  - sentiment: "positive" | "negative" | "neutral"
  - score: a number in [-1, 1] where -1 is most negative, 0 is neutral, +1 is most positive
  - reason: ONE short phrase (max 80 chars) explaining the verdict (e.g., "asking pricing question", "complaint about delivery delay", "fan praise")

Rules:
  - Multilingual: handle Romanian, English, and other languages.
  - Sarcasm: if obvious, classify as negative even if words are positive ("yeah, GREAT service ⭐").
  - Questions are usually neutral unless tone is angry or excited.
  - Pure emojis (👍 👏 ❤️) → positive. (👎 😡) → negative. Mixed → neutral.
  - Spam/promotional from competitors → neutral with reason "spam-promo".

Return STRICT JSON ARRAY (no preamble, no explanation outside the array):
[
  {"id": "uuid-here", "sentiment": "positive", "score": 0.85, "reason": "asking where to buy"},
  ...
]`;

async function classifyBatch(messages: MessageRow[]): Promise<ClassificationResult[]> {
  const anthropic = getAppAnthropicClient();
  const input = messages.map((m) => ({
    id: m.id,
    text: m.content.slice(0, 500), // truncate long messages
    platform: m.platform,
    author: m.author_handle ?? "unknown",
  }));

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: `Classify these ${input.length} messages:\n\n${JSON.stringify(input, null, 2)}` },
    ],
  });

  let raw = "";
  for (const block of resp.content) {
    if (block.type === "text") raw += block.text;
  }

  // Extract the JSON array
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end < start) {
    throw new Error(`No JSON array in Haiku output: ${raw.slice(0, 200)}`);
  }
  return JSON.parse(raw.slice(start, end + 1)) as ClassificationResult[];
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/maint/sentiment-classifier")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supa = createServiceClient();

  // Pull pending messages — sentiment IS NULL — across all users.
  // Order: oldest first so we drain the queue FIFO.
  const { data: pending, error: fetchErr } = await supa
    .from("social_messages")
    .select("id, user_id, platform, content, author_handle")
    .is("sentiment", null)
    .order("received_at", { ascending: true })
    .limit(BATCH_SIZE * MAX_BATCHES_PER_RUN);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const queue = (pending ?? []) as MessageRow[];
  if (queue.length === 0) {
    return NextResponse.json({ ok: true, classified: 0, batches: 0, queue_empty: true });
  }

  let totalClassified = 0;
  let totalErrors = 0;
  const errors: string[] = [];

  // Process in batches sequentially (Haiku can handle parallel but we don't
  // want to spike cost or hit rate limits)
  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE);
    let results: ClassificationResult[];
    try {
      results = await classifyBatch(batch);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`batch ${i / BATCH_SIZE}: ${msg}`);
      totalErrors += batch.length;
      continue;
    }

    // Apply each result back to social_messages
    for (const r of results) {
      const update: Record<string, unknown> = {
        sentiment: r.sentiment,
        sentiment_score: Math.max(-1, Math.min(1, Number(r.score) || 0)),
      };

      // Bonus: bump priority on strong negative sentiment (likely a complaint)
      if (r.sentiment === "negative" && r.score <= -MIN_CONFIDENCE_FOR_PRIORITY_BUMP) {
        update.priority = "high";
      }

      const { error: upErr } = await supa
        .from("social_messages")
        .update(update)
        .eq("id", r.id);

      if (upErr) {
        errors.push(`update ${r.id}: ${upErr.message}`);
        totalErrors++;
      } else {
        totalClassified++;
      }
    }
  }

  // Report a finding only if we hit persistent errors (>10% failure rate)
  const active = new Set<string>();
  if (errors.length > 0 && totalErrors / queue.length > 0.1) {
    const fp = `sentiment-classifier:high-error-rate`;
    active.add(fp);
    await reportFinding({
      agent: AGENT_NAME,
      severity: "medium",
      fingerprint: fp,
      title: `Sentiment classifier error rate ${Math.round((totalErrors / queue.length) * 100)}% (${totalErrors}/${queue.length})`,
      details: { errors: errors.slice(0, 10), batch_size: BATCH_SIZE },
      fix_suggestion:
        "Check Anthropic API quota / availability. If persistent, the prompt may need tuning for the specific message format.",
    });
  }
  await autoResolveStale(AGENT_NAME, active);

  // Log to cron_logs
  try {
    await supa.from("cron_logs").insert({
      job: "sentiment-classifier",
      ran_at: new Date().toISOString(),
      result: {
        queue_size: queue.length,
        classified: totalClassified,
        errors: totalErrors,
        batches: Math.ceil(queue.length / BATCH_SIZE),
      },
    });
  } catch { /* ignore */ }

  return NextResponse.json({
    ok: totalErrors < queue.length / 2,
    queue_size: queue.length,
    classified: totalClassified,
    errors: totalErrors,
    batches: Math.ceil(queue.length / BATCH_SIZE),
    error_details: errors.length > 0 ? errors.slice(0, 5) : undefined,
  });
}
