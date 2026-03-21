import { Resend } from "resend";

const FROM = "MarketHub Pro <noreply@markethubpromo.com>";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendWelcomeEmail(email: string, name: string) {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Bun venit la MarketHub Pro!",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FFF8F0;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#F59E0B,#D97706);">
            <span style="color:white;font-size:22px;font-weight:bold;">M</span>
          </div>
          <h1 style="color:#292524;margin:12px 0 4px;font-size:22px;">MarketHub Pro</h1>
        </div>
        <h2 style="color:#292524;font-size:18px;margin-bottom:8px;">Bun venit, ${name}!</h2>
        <p style="color:#78614E;line-height:1.6;margin-bottom:16px;">
          Contul tau a fost creat cu succes. Acum ai acces la analytics pentru YouTube, TikTok si Instagram — toate intr-un singur loc.
        </p>
        <p style="color:#78614E;line-height:1.6;margin-bottom:24px;">
          Incepi cu planul <strong>Free</strong>. Daca vrei mai multe date si canale, poti face upgrade oricand.
        </p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="https://markethubpromo.com" style="display:inline-block;background:#F59E0B;color:#1C1814;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
            Deschide dashboard
          </a>
        </div>
        <p style="color:#C4AA8A;font-size:12px;text-align:center;margin:0;">
          © 2026 MarketHub Pro · <a href="https://markethubpromo.com/privacy" style="color:#F59E0B;">Privacy</a> · <a href="https://markethubpromo.com/terms" style="color:#F59E0B;">Terms</a>
        </p>
      </div>
    `,
  });
}

export async function sendPaymentConfirmationEmail(email: string, name: string, plan: string) {
  const planLabel = plan === "pro" ? "Pro" : "Enterprise";
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Abonament ${planLabel} activat — MarketHub Pro`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FFF8F0;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#F59E0B,#D97706);">
            <span style="color:white;font-size:22px;font-weight:bold;">M</span>
          </div>
          <h1 style="color:#292524;margin:12px 0 4px;font-size:22px;">MarketHub Pro</h1>
        </div>
        <h2 style="color:#292524;font-size:18px;margin-bottom:8px;">Plata confirmata!</h2>
        <p style="color:#78614E;line-height:1.6;margin-bottom:16px;">
          Salut ${name}, abonamentul tau <strong>${planLabel}</strong> este activ. Acum ai acces complet la toate functiile platformei.
        </p>
        <div style="background:#FFFCF7;border:1px solid rgba(245,215,160,0.5);border-radius:10px;padding:16px;margin-bottom:24px;">
          <p style="margin:0 0 6px;color:#78614E;font-size:13px;"><strong>Plan:</strong> ${planLabel}</p>
          <p style="margin:0;color:#78614E;font-size:13px;"><strong>Status:</strong> Activ</p>
        </div>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="https://markethubpromo.com" style="display:inline-block;background:#F59E0B;color:#1C1814;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
            Deschide dashboard
          </a>
        </div>
        <p style="color:#C4AA8A;font-size:12px;text-align:center;margin:0;">
          © 2026 MarketHub Pro · <a href="https://markethubpromo.com/privacy" style="color:#F59E0B;">Privacy</a> · <a href="https://markethubpromo.com/terms" style="color:#F59E0B;">Terms</a>
        </p>
      </div>
    `,
  });
}

export async function sendSubscriptionCancelledEmail(email: string, name: string) {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Abonamentul tau a fost anulat — MarketHub Pro",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FFF8F0;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#F59E0B,#D97706);">
            <span style="color:white;font-size:22px;font-weight:bold;">M</span>
          </div>
          <h1 style="color:#292524;margin:12px 0 4px;font-size:22px;">MarketHub Pro</h1>
        </div>
        <h2 style="color:#292524;font-size:18px;margin-bottom:8px;">Abonament anulat</h2>
        <p style="color:#78614E;line-height:1.6;margin-bottom:16px;">
          Salut ${name}, abonamentul tau a fost anulat. Contul tau a revenit la planul <strong>Free</strong>.
        </p>
        <p style="color:#78614E;line-height:1.6;margin-bottom:24px;">
          Daca te-ai razgandit sau ai anulat din greseala, poti reactiva oricand din sectiunea Upgrade.
        </p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="https://markethubpromo.com/upgrade" style="display:inline-block;background:#F59E0B;color:#1C1814;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
            Reactivare abonament
          </a>
        </div>
        <p style="color:#C4AA8A;font-size:12px;text-align:center;margin:0;">
          © 2026 MarketHub Pro · <a href="https://markethubpromo.com/privacy" style="color:#F59E0B;">Privacy</a> · <a href="https://markethubpromo.com/terms" style="color:#F59E0B;">Terms</a>
        </p>
      </div>
    `,
  });
}
