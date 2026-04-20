/**
 * Calendar approval endpoint — Wave 1 extension.
 *
 * Handles the full approval thread between the agency and a client on a
 * scheduled_posts row:
 *
 *   POST  — agency sends a post out for approval. Generates a fresh
 *           approval_token, sets status=pending, emails the client.
 *
 *   GET   — client loads the approval page by token. Returns the post
 *           plus the full comments thread.
 *
 *   PATCH — client approves or rejects. Updates the top-level
 *           approval_status AND appends to approval_responses jsonb
 *           via the append_approval_response RPC (so multi-client
 *           approvals don't overwrite each other). Optionally stores
 *           the top-level approval_note on the post.
 *
 *   PUT   — client leaves a comment WITHOUT approving/rejecting.
 *           Inserts into post_approval_comments. Lets the thread
 *           happen asynchronously before the final verdict.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// Agency sends post to client for approval.
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const body = await req.json();
  const post_id = body.post_id as string | undefined;
  const client_email = body.client_email as string | undefined;
  const message = body.message as string | undefined;
  if (!post_id || !client_email) {
    return NextResponse.json({ error: "post_id and client_email required" }, { status: 400 });
  }

  const supa = createServiceClient();
  const token = generateToken();

  const { data: post, error } = await supa
    .from("scheduled_posts")
    .update({
      approval_status: "pending",
      approval_token: token,
      client_email,
      // Initialize the multi-approver tracker if not present
      approval_required_from: [client_email],
      approval_responses: {},
    })
    .eq("id", post_id)
    .eq("user_id", auth.userId)
    .select()
    .single();

  if (error || !post) {
    return NextResponse.json({ error: error?.message ?? "Post not found" }, { status: 500 });
  }

  const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://markethubpromo.com"}/approve/${token}`;

  await resend.emails
    .send({
      from: "MarketHub Pro <noreply@markethubpromo.com>",
      to: client_email,
      subject: `Aprobare conținut — ${post.caption?.slice(0, 50) ?? "Post nou"}`,
      html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#292524">
        <h2 style="color:#F59E0B">Conținut în așteptarea aprobării</h2>
        ${message ? `<p>${message}</p>` : ""}
        <div style="background:#FFF8F0;border:1px solid #F5D7A0;padding:16px;border-radius:8px;margin:24px 0">
          <p style="margin:0;font-size:14px;color:#292524">${post.caption?.slice(0, 300) ?? ""}${(post.caption?.length ?? 0) > 300 ? "..." : ""}</p>
          ${post.platform ? `<p style="margin:8px 0 0;font-size:12px;color:#A8967E">Platform: ${post.platform} · ${post.date ? new Date(post.date).toLocaleDateString("ro-RO") : "Draft"}${post.time ? " " + post.time.slice(0, 5) : ""}</p>` : ""}
        </div>
        <p style="margin:16px 0;font-size:13px;color:#78614E">Poți aproba, respinge sau lăsa comentarii pe link:</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <a href="${approvalUrl}?action=approve" style="background:#10B981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">✓ Aprobă</a>
          <a href="${approvalUrl}?action=reject" style="background:#EF4444;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">✗ Respinge</a>
          <a href="${approvalUrl}" style="background:#F59E0B;color:#1C1814;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Comentează</a>
        </div>
        <p style="margin-top:32px;color:#A8967E;font-size:12px">— MarketHub Pro</p>
      </div>
    `,
    })
    .catch(() => {});

  return NextResponse.json({ ok: true, token, approval_url: approvalUrl });
}

// Public: client approves or rejects by token.
export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    token?: string;
    action?: string;
    note?: string;
    client_email?: string;
    client_name?: string;
  } | null;
  if (!body?.token || !body.action || !["approve", "reject"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supa = createServiceClient();

  // Find the post by token
  const { data: post, error: lookupErr } = await supa
    .from("scheduled_posts")
    .select("id, client_email, approval_responses")
    .eq("approval_token", body.token)
    .single();
  if (lookupErr || !post) {
    return NextResponse.json({ error: "Token invalid" }, { status: 404 });
  }

  const newStatus = body.action === "approve" ? "approved" : "rejected";
  const email = body.client_email ?? post.client_email ?? "unknown@client";

  // Update the top-level approval_status + note + approved_at
  const { error: updErr } = await supa
    .from("scheduled_posts")
    .update({
      approval_status: newStatus,
      approval_note: body.note ?? "",
      approved_at: new Date().toISOString(),
    })
    .eq("id", post.id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // Atomically append to approval_responses via RPC
  try {
    await supa.rpc("append_approval_response", {
      p_post_id: post.id,
      p_email: email,
      p_status: newStatus,
      p_comment: body.note ?? "",
    });
  } catch {
    /* non-fatal — the top-level approval_status is already updated */
  }

  // If there's a note, also store it as a visible comment in the thread
  if (body.note && body.note.trim()) {
    try {
      await supa.from("post_approval_comments").insert({
        post_id: post.id,
        client_email: email,
        client_name: body.client_name ?? null,
        comment: `[${newStatus === "approved" ? "✓ Aprobat" : "✗ Respins"}] ${body.note.trim()}`,
        is_internal: false,
      });
    } catch {
      /* non-fatal */
    }
  }

  return NextResponse.json({ ok: true, status: newStatus });
}

// Public: client adds a comment WITHOUT approving/rejecting.
export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    token?: string;
    comment?: string;
    client_email?: string;
    client_name?: string;
  } | null;
  if (!body?.token || !body.comment?.trim()) {
    return NextResponse.json({ error: "token and comment required" }, { status: 400 });
  }

  const supa = createServiceClient();

  const { data: post, error: lookupErr } = await supa
    .from("scheduled_posts")
    .select("id, client_email")
    .eq("approval_token", body.token)
    .single();
  if (lookupErr || !post) {
    return NextResponse.json({ error: "Token invalid" }, { status: 404 });
  }

  const { data: inserted, error: insErr } = await supa
    .from("post_approval_comments")
    .insert({
      post_id: post.id,
      client_email: body.client_email ?? post.client_email ?? null,
      client_name: body.client_name ?? null,
      comment: body.comment.trim(),
      is_internal: false,
    })
    .select()
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, comment: inserted });
}

// Public: client loads the post + full comments thread by token.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }
  const supa = createServiceClient();

  const { data: post, error } = await supa
    .from("scheduled_posts")
    .select(
      "id,caption,platform,date,time,approval_status,approval_note,approval_responses,revision_count,image_url,client_email",
    )
    .eq("approval_token", token)
    .single();
  if (error || !post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch the comments thread
  const { data: comments } = await supa
    .from("post_approval_comments")
    .select("id, client_email, client_name, comment, is_internal, created_at")
    .eq("post_id", post.id)
    .eq("is_internal", false) // client-visible only
    .order("created_at", { ascending: true });

  return NextResponse.json({
    post,
    comments: comments ?? [],
  });
}
