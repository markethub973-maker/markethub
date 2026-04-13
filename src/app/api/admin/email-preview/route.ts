/**
 * Admin tool — preview branded email templates.
 *
 * GET /api/admin/email-preview?template=welcome&name=Eduard
 *   → renders HTML inline (use in browser to see rendering)
 *
 * POST /api/admin/email-preview { template, data, send_to }
 *   → optionally sends a test email to send_to
 *
 * Lets Eduard tweak templates + see results before customers do.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { previewEmail, sendBrandedEmail, type TemplateName } from "@/lib/emailTemplates";

export const dynamic = "force-dynamic";

const TEMPLATES: TemplateName[] = ["welcome", "trial-ending", "notification"];

function isTemplate(s: string): s is TemplateName {
  return (TEMPLATES as readonly string[]).includes(s);
}

function buildData(template: TemplateName, params: URLSearchParams) {
  switch (template) {
    case "welcome":
      return { name: params.get("name") ?? "Alex" };
    case "trial-ending":
      return {
        daysLeft: Number(params.get("daysLeft") ?? 3),
        name: params.get("name") ?? "Alex",
      };
    case "notification":
      return {
        title: params.get("title") ?? "Test notification",
        body:
          params.get("body") ??
          "This is a test notification body. Paragraphs are split on double newlines.\n\nSecond paragraph.",
        cta: params.get("cta_label")
          ? { label: params.get("cta_label")!, url: params.get("cta_url") ?? "/" }
          : undefined,
      };
  }
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tplParam = req.nextUrl.searchParams.get("template") ?? "welcome";
  if (!isTemplate(tplParam)) {
    return NextResponse.json(
      { error: `Unknown template. Use one of: ${TEMPLATES.join(", ")}` },
      { status: 400 },
    );
  }

  const data = buildData(tplParam, req.nextUrl.searchParams);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rendered = previewEmail(tplParam, data as any);

  const format = req.nextUrl.searchParams.get("format") ?? "html";
  if (format === "json") {
    return NextResponse.json({ ok: true, ...rendered });
  }
  if (format === "text") {
    return new Response(rendered.text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(rendered.html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    template?: string;
    data?: Record<string, unknown>;
    send_to?: string;
  } | null;
  if (!body?.template || !isTemplate(body.template)) {
    return NextResponse.json({ error: "template required" }, { status: 400 });
  }
  if (!body.send_to) {
    return NextResponse.json({ error: "send_to email required" }, { status: 400 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await sendBrandedEmail(body.send_to, body.template, (body.data ?? {}) as any);
  return NextResponse.json(r);
}
