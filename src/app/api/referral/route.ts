import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function generateCode(userId: string): string {
  return "MHP" + userId.slice(0, 6).toUpperCase().replace(/-/g, "") + Math.floor(100 + Math.random() * 900);
}

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const supa = createServiceClient();

  // Ensure user has referral code
  const { data: profile } = await supa.from("profiles").select("referral_code, name, email").eq("id", auth.userId).single();
  let code = profile?.referral_code;
  if (!code) {
    code = generateCode(auth.userId);
    await supa.from("profiles").update({ referral_code: code }).eq("id", auth.userId);
  }

  const { data: referrals } = await supa.from("referrals").select("*").eq("referrer_id", auth.userId).order("created_at", { ascending: false });

  return NextResponse.json({ code, referrals: referrals ?? [], profile });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { email } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "email required" }, { status: 400 });

  const supa = createServiceClient();
  const { data: profile } = await supa.from("profiles").select("referral_code, name").eq("id", auth.userId).single();
  const code = profile?.referral_code;

  const { data, error } = await supa.from("referrals").insert({
    referrer_id: auth.userId,
    referee_email: email.trim(),
    code: code + "_" + Date.now().toString(36),
    status: "pending",
    reward_value: 20,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send invite email
  await resend.emails.send({
    from: "MarketHub Pro <noreply@markethubpromo.com>",
    to: email.trim(),
    subject: `${profile?.name ?? "Un prieten"} te invită la MarketHub Pro — 20% discount`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#292524">
        <h2 style="color:#F59E0B">20% Discount la MarketHub Pro</h2>
        <p><strong>${profile?.name ?? "Un coleg"}</strong> te-a invitat să testezi MarketHub Pro — platforma all-in-one pentru agenții de marketing.</p>
        <div style="background:#FFF8F0;border-left:4px solid #F59E0B;padding:16px;margin:24px 0;border-radius:4px">
          <p style="margin:0;font-weight:bold;color:#D97706">🎁 Codul tău de reducere: ${code}</p>
          <p style="margin:8px 0 0;font-size:13px;color:#78614E">Folosește-l la înregistrare pentru 20% off primul an.</p>
        </div>
        <a href="https://markethubpromo.com/register?ref=${code}" style="display:inline-block;margin-top:8px;background:#F59E0B;color:#1C1814;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
          Încearcă gratuit 7 zile
        </a>
        <p style="margin-top:32px;color:#A8967E;font-size:12px">— MarketHub Pro</p>
      </div>
    `,
  }).catch(() => {});

  return NextResponse.json({ referral: data }, { status: 201 });
}
