/**
 * GET /api/brain/alex-loom/avatar-poll
 *
 * Cron job that polls all queued OmniHuman avatar jobs (alex-loom outputs
 * with avatar_status="queued") and:
 *   - if COMPLETED → fetches the video URL, downloads it, sends to Telegram
 *     for Eduard to review, marks the manifest avatar_status="ready"
 *   - if FAILED/ERROR → marks avatar_status="failed" with reason
 *   - else (IN_QUEUE / IN_PROGRESS) → leaves alone, will recheck next run
 *
 * Schedule: every minute via vercel cron OR external scheduler.
 * Auth: x-brain-cron-secret header.
 *
 * This is the second half of the alex-loom async pipeline; the request
 * handler enqueues, this endpoint completes the loop.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getEduardAvatarJob } from "@/lib/eduardAvatar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface KbRow {
  id: string;
  name: string;
  content: Record<string, unknown> | null;
}

async function notifyTelegram(prospect: string, videoUrl: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const videoBuf = Buffer.from(await (await fetch(videoUrl)).arrayBuffer());
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("video", new Blob([videoBuf], { type: "video/mp4" }), `alexloom_${prospect}.mp4`);
    form.append(
      "caption",
      `🎬 AlexLoom · ${prospect}\n\nAvatar Eduard ready (OmniHuman lip sync). Review & approve to email prospect.`,
    );
    form.append("supports_streaming", "true");
    const r = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
      method: "POST",
      body: form,
    });
    const j = (await r.json()) as { ok?: boolean };
    return Boolean(j.ok);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-brain-cron-secret");
  if (!secret || secret !== process.env.BRAIN_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();
  // Pull recent AlexLoom outputs (last 6h) with queued avatars
  const sinceIso = new Date(Date.now() - 6 * 3600_000).toISOString();
  const { data: rows } = await svc
    .from("brain_knowledge_base")
    .select("id, name, content")
    .eq("category", "case_study")
    .contains("tags", ["alex-loom"])
    .gte("created_at", sinceIso)
    .limit(50);

  const candidates = ((rows ?? []) as KbRow[]).filter((r) => {
    const c = r.content ?? {};
    return c.avatar_status === "queued" && typeof c.avatar_request_id === "string";
  });

  const summary = {
    checked: candidates.length,
    ready: 0,
    still_running: 0,
    failed: 0,
    notified: 0,
  };

  for (const row of candidates) {
    const c = row.content ?? {};
    const reqId = c.avatar_request_id as string;
    const result = await getEduardAvatarJob(reqId);
    const businessName = (c.prospect_name as string) || (c.domain as string) || "prospect";

    if (result.status === "COMPLETED" && result.video_url) {
      summary.ready += 1;
      const sent = await notifyTelegram(businessName, result.video_url);
      if (sent) summary.notified += 1;
      await svc
        .from("brain_knowledge_base")
        .update({
          content: {
            ...c,
            video_url: result.video_url,
            avatar_status: "ready",
            avatar_completed_at: new Date().toISOString(),
            telegram_notified: sent,
          },
        })
        .eq("id", row.id);
    } else if (result.status === "FAILED" || result.status === "ERROR") {
      summary.failed += 1;
      await svc
        .from("brain_knowledge_base")
        .update({
          content: {
            ...c,
            avatar_status: "failed",
            avatar_error: result.error ?? "unknown",
          },
        })
        .eq("id", row.id);
    } else {
      summary.still_running += 1;
    }
  }

  return NextResponse.json({ ok: true, ...summary });
}
