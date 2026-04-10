import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Use cryptographically secure random bytes — Math.random() is NOT secure
// and predictable, making approval tokens forgeable.
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// Send post for client approval
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { post_id, client_email, message } = await req.json();
  if (!post_id || !client_email) return NextResponse.json({ error: "post_id and client_email required" }, { status: 400 });

  const supa = createServiceClient();
  const token = generateToken();

  const { data: post, error } = await supa.from("scheduled_posts")
    .update({ approval_status: "pending", approval_token: token, client_email })
    .eq("id", post_id)
    .select()
    .single();

  if (error || !post) return NextResponse.json({ error: error?.message ?? "Post not found" }, { status: 500 });

  const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/approve/${token}`;

  await resend.emails.send({
    from: "MarketHub Pro <noreply@markethubpromo.com>",
    to: client_email,
    subject: `Aprobare conținut — ${post.content?.slice(0, 50) ?? "Post nou"}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#292524">
        <h2 style="color:#F59E0B">Conținut în așteptarea aprobării</h2>
        ${message ? `<p>${message}</p>` : ""}
        <div style="background:#FFF8F0;border:1px solid #F5D7A0;padding:16px;border-radius:8px;margin:24px 0">
          <p style="margin:0;font-size:14px;color:#292524">${post.content?.slice(0, 300) ?? ""}${(post.content?.length ?? 0) > 300 ? "..." : ""}</p>
          ${post.platform ? `<p style="margin:8px 0 0;font-size:12px;color:#A8967E">Platform: ${post.platform} · ${post.scheduled_for ? new Date(post.scheduled_for).toLocaleDateString("ro-RO") : "Draft"}</p>` : ""}
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <a href="${approvalUrl}?action=approve" style="background:#10B981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">✓ Aprobă</a>
          <a href="${approvalUrl}?action=reject" style="background:#EF4444;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">✗ Respinge</a>
          <a href="${approvalUrl}" style="background:#F59E0B;color:#1C1814;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Vizualizează</a>
        </div>
        <p style="margin-top:32px;color:#A8967E;font-size:12px">— MarketHub Pro</p>
      </div>
    `,
  }).catch(() => {});

  return NextResponse.json({ ok: true, token, approval_url: approvalUrl });
}

// Client approves/rejects (public — token auth)
export async function PATCH(req: NextRequest) {
  const { token, action, note } = await req.json();
  if (!token || !["approve", "reject"].includes(action)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supa = createServiceClient();
  const newStatus = action === "approve" ? "approved" : "rejected";

  const { data, error } = await supa.from("scheduled_posts")
    .update({ approval_status: newStatus, approval_note: note ?? "", approved_at: new Date().toISOString() })
    .eq("approval_token", token)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: "Token invalid" }, { status: 404 });
  return NextResponse.json({ ok: true, status: newStatus, post: data });
}

// Get post by token (public)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
  const supa = createServiceClient();
  const { data, error } = await supa.from("scheduled_posts").select("id,content,platform,scheduled_for,approval_status,approval_note,image_url").eq("approval_token", token).single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post: data });
}
