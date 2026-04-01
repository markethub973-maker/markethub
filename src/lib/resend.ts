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

// ─── Onboarding Sequence (5 emails) ──────────────────────────────────────────

const BTN = (url: string, label: string) =>
  `<div style="text-align:center;margin:20px 0;"><a href="${url}" style="display:inline-block;background:#F59E0B;color:#1C1814;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">${label}</a></div>`;

const FOOTER = `<p style="color:#C4AA8A;font-size:12px;text-align:center;margin:24px 0 0;">© 2026 MarketHub Pro · <a href="https://markethubpromo.com/privacy" style="color:#F59E0B;">Privacy</a> · <a href="https://markethubpromo.com/unsubscribe" style="color:#F59E0B;">Unsubscribe</a></p>`;

const HEADER = `<div style="text-align:center;margin-bottom:20px;"><div style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#F59E0B,#D97706);"><span style="color:white;font-size:20px;font-weight:bold;">M</span></div><h1 style="color:#292524;margin:10px 0 2px;font-size:20px;">MarketHub Pro</h1></div>`;

const WRAP = (content: string) =>
  `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:28px 22px;background:#FFF8F0;border-radius:16px;">${HEADER}${content}${FOOTER}</div>`;

const li = (text: string) => `<li style="color:#78614E;margin-bottom:6px;">${text}</li>`;

export async function sendOnboarding1_Welcome(email: string, name: string) {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Day 1: Here's what you can do with MarketHub Pro",
    html: WRAP(`
      <h2 style="color:#292524;font-size:17px;margin-bottom:8px;">Welcome, ${name}!</h2>
      <p style="color:#78614E;line-height:1.6;margin-bottom:12px;">Your account is live. Here's a quick overview of what's available right now:</p>
      <ul style="padding-left:18px;margin-bottom:16px;">
        ${li("<strong>YouTube Analytics</strong> — Channel stats, top videos, trending in your niche")}
        ${li("<strong>Instagram Analytics</strong> — Feed insights, demographics, hashtag performance")}
        ${li("<strong>TikTok Search</strong> — Find viral content and trending accounts")}
        ${li("<strong>AI Caption Generator</strong> — 3 variations per topic, across all platforms")}
        ${li("<strong>Competitor Tracker</strong> — Monitor any public brand's social presence")}
        ${li("<strong>AI Agents</strong> — 8 specialized assistants for research, email, strategy")}
      </ul>
      <p style="color:#78614E;line-height:1.6;margin-bottom:16px;">Start with YouTube — connect your channel and get your first report in 60 seconds.</p>
      ${BTN("https://markethubpromo.com/youtube", "Go to YouTube Analytics")}
    `),
  });
}

export async function sendOnboarding2_Setup(email: string, name: string) {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Day 2: Connect your YouTube channel (2 minutes)",
    html: WRAP(`
      <h2 style="color:#292524;font-size:17px;margin-bottom:8px;">Connect YouTube, ${name}</h2>
      <p style="color:#78614E;line-height:1.6;margin-bottom:12px;">MarketHub Pro uses the YouTube Data API — no login required, just your channel URL or ID.</p>
      <p style="color:#78614E;margin-bottom:6px;"><strong>How to find your Channel ID:</strong></p>
      <ol style="padding-left:18px;margin-bottom:16px;">
        ${li("Go to YouTube Studio → Settings → Channel → Advanced settings")}
        ${li("Copy the Channel ID (starts with UC...)")}
        ${li("Paste it in MarketHub Pro → YouTube Analytics")}
      </ol>
      <p style="color:#78614E;line-height:1.6;margin-bottom:12px;">You'll instantly see: subscriber count, total views, top 10 videos, engagement rate, and growth trend.</p>
      ${BTN("https://markethubpromo.com/youtube", "Connect my YouTube channel")}
    `),
  });
}

export async function sendOnboarding3_Instagram(email: string, name: string) {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Day 3: Unlock your Instagram data",
    html: WRAP(`
      <h2 style="color:#292524;font-size:17px;margin-bottom:8px;">Instagram Analytics, ${name}</h2>
      <p style="color:#78614E;line-height:1.6;margin-bottom:12px;">Connect your Instagram Business account to unlock:</p>
      <ul style="padding-left:18px;margin-bottom:16px;">
        ${li("Post reach, impressions, and engagement by content type")}
        ${li("Audience demographics: age, gender, city, country")}
        ${li("Best posting times based on your followers' activity")}
        ${li("Top hashtag performance (reach per hashtag)")}
        ${li("AI Sentiment Analysis on your comments")}
      </ul>
      <p style="color:#78614E;line-height:1.6;margin-bottom:12px;"><strong>Requirements:</strong> Instagram Business or Creator account linked to a Facebook Page.</p>
      ${BTN("https://markethubpromo.com/settings?tab=integrations", "Connect Instagram")}
    `),
  });
}

export async function sendOnboarding4_Competitors(email: string, name: string) {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Day 5: Analyze your top competitors in 30 seconds",
    html: WRAP(`
      <h2 style="color:#292524;font-size:17px;margin-bottom:8px;">Competitor Intelligence, ${name}</h2>
      <p style="color:#78614E;line-height:1.6;margin-bottom:12px;">The Competitors section lets you monitor any public brand — automatically.</p>
      <p style="color:#78614E;margin-bottom:6px;"><strong>What you can track:</strong></p>
      <ul style="padding-left:18px;margin-bottom:16px;">
        ${li("Any Instagram account: followers, engagement rate, post frequency")}
        ${li("YouTube channels: subscriber growth, view velocity, top videos")}
        ${li("Ads Library: see what ads they're running on Facebook & Instagram")}
        ${li("AI Buyer Persona: who their audience is and how to steal them")}
      </ul>
      <p style="color:#78614E;line-height:1.6;margin-bottom:12px;"><strong>Pro tip:</strong> Add 3-5 competitors now and check weekly — you'll spot their strategy shifts before they take effect.</p>
      ${BTN("https://markethubpromo.com/competitors", "Add your first competitor")}
    `),
  });
}

export async function sendOnboarding5_ProTips(email: string, name: string) {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Day 7: 5 power features most users never discover",
    html: WRAP(`
      <h2 style="color:#292524;font-size:17px;margin-bottom:8px;">Power Features, ${name}</h2>
      <p style="color:#78614E;line-height:1.6;margin-bottom:12px;">A week in — here are the features that separate casual users from power users:</p>
      <ol style="padding-left:18px;margin-bottom:16px;">
        ${li("<strong>A/B Title Generator</strong> — Generate 10 title variants for any video. Test and pick the winner.")}
        ${li("<strong>Deep Research Agent</strong> — Ask any market research question. Gets real data, not hallucinations.")}
        ${li("<strong>TikTok Trending Sounds</strong> — See what audio is exploding right now before it peaks.")}
        ${li("<strong>Monthly AI Report</strong> — One click, full business brief on your last 30 days.")}
        ${li("<strong>Export to Excel</strong> — Download any data table. Perfect for client presentations.")}
      </ol>
      <p style="color:#78614E;line-height:1.6;margin-bottom:12px;">Still on the Free plan? Upgrade to unlock all features — plans start at $9/month.</p>
      ${BTN("https://markethubpromo.com/upgrade", "See upgrade options")}
    `),
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

// ─── Trial Notifications ──────────────────────────────────────────────────────

export async function sendTrialExpiringSoonEmail(email: string, name: string, daysLeft: number) {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Trialul tau expira in ${daysLeft} ${daysLeft === 1 ? "zi" : "zile"} — MarketHub Pro`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FFF8F0;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#F59E0B,#D97706);">
            <span style="color:white;font-size:22px;font-weight:bold;">M</span>
          </div>
          <h1 style="color:#292524;margin:12px 0 4px;font-size:22px;">MarketHub Pro</h1>
        </div>
        <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:14px 16px;margin-bottom:20px;text-align:center;">
          <span style="font-size:13px;font-weight:700;color:#D97706;">⏳ ${daysLeft} ${daysLeft === 1 ? "zi" : "zile"} ramase din trial</span>
        </div>
        <h2 style="color:#292524;font-size:17px;margin-bottom:8px;">Salut, ${name}!</h2>
        <p style="color:#78614E;line-height:1.6;margin-bottom:20px;">
          Trialul tau gratuit de 7 zile expira curand. Nu iti pierde accesul la analytics, AI tools si toate datele conectate.
        </p>
        <p style="color:#78614E;line-height:1.6;margin-bottom:24px;">
          Alege un plan si continua fara intreruperi — fara sa pierzi nimic din ce ai configurat.
        </p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="https://markethubpromo.com/upgrade" style="display:inline-block;background:#F59E0B;color:#1C1814;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
            Alege un plan acum
          </a>
        </div>
        <p style="color:#C4AA8A;font-size:12px;text-align:center;margin:0;">
          © 2026 MarketHub Pro · <a href="https://markethubpromo.com/privacy" style="color:#F59E0B;">Privacy</a> · <a href="https://markethubpromo.com/terms" style="color:#F59E0B;">Terms</a>
        </p>
      </div>
    `,
  });
}

export async function sendTrialExpiredEmail(email: string, name: string) {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Trialul tau a expirat — MarketHub Pro",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FFF8F0;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#F59E0B,#D97706);">
            <span style="color:white;font-size:22px;font-weight:bold;">M</span>
          </div>
          <h1 style="color:#292524;margin:12px 0 4px;font-size:22px;">MarketHub Pro</h1>
        </div>
        <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px 16px;margin-bottom:20px;text-align:center;">
          <span style="font-size:13px;font-weight:700;color:#dc2626;">Trial expirat</span>
        </div>
        <h2 style="color:#292524;font-size:17px;margin-bottom:8px;">Salut, ${name},</h2>
        <p style="color:#78614E;line-height:1.6;margin-bottom:20px;">
          Cei 7 zile de trial gratuit au expirat. Accesul la analytics si AI tools este momentan restrictionat.
        </p>
        <p style="color:#78614E;line-height:1.6;margin-bottom:24px;">
          Activeaza un plan platit pentru a recapata accesul complet la toate datele si functiile tale.
        </p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="https://markethubpromo.com/upgrade-required" style="display:inline-block;background:#F59E0B;color:#1C1814;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
            Reactiveaza contul
          </a>
        </div>
        <p style="color:#A8967E;font-size:12px;text-align:center;margin-bottom:8px;">
          Ai intrebari? Scrie-ne la <a href="mailto:support@markethubpromo.com" style="color:#F59E0B;">support@markethubpromo.com</a>
        </p>
        <p style="color:#C4AA8A;font-size:12px;text-align:center;margin:0;">
          © 2026 MarketHub Pro · <a href="https://markethubpromo.com/privacy" style="color:#F59E0B;">Privacy</a> · <a href="https://markethubpromo.com/terms" style="color:#F59E0B;">Terms</a>
        </p>
      </div>
    `,
  });
}

interface PaymentFailedAlertParams {
  customerEmail: string;
  customerName: string;
  plan: string;
  invoiceId: string;
  amount: string;
}

export async function sendAdminPaymentFailedAlert(params: PaymentFailedAlertParams) {
  const adminEmail = process.env.ADMIN_EMAIL!;
  const { customerEmail, customerName, plan, invoiceId, amount } = params;
  await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: "MarketHub Pro Alerts <noreply@markethubpromo.com>",
    to: adminEmail,
    subject: `[Action Required] Payment failed — ${customerEmail}`,
    html: `
      <div style="font-family:monospace;max-width:520px;margin:0 auto;padding:24px;background:#1a1a1a;color:#e5e5e5;border-radius:8px;">
        <h2 style="color:#ef4444;margin:0 0 16px;">⚠️ Payment Failed</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="padding:6px 0;color:#888;">Customer</td><td style="padding:6px 0;color:#fff;">${customerName}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;color:#fff;">${customerEmail}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Plan</td><td style="padding:6px 0;color:#fff;">${plan}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Amount</td><td style="padding:6px 0;color:#ef4444;font-weight:bold;">$${amount}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Invoice ID</td><td style="padding:6px 0;color:#aaa;">${invoiceId}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Time</td><td style="padding:6px 0;color:#aaa;">${new Date().toISOString()}</td></tr>
        </table>
        <p style="margin-top:20px;font-size:12px;color:#555;">MarketHub Pro internal alert — do not reply</p>
      </div>
    `,
  });
}

export async function sendEngagementAlertEmail(
  email: string,
  name: string,
  username: string,
  engRate: number,
  threshold: number,
  topPost: { caption?: string; engRate: number } | null,
) {
  const color = engRate < 1 ? "#DC2626" : "#D97706";
  const bg = engRate < 1 ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)";
  const border = engRate < 1 ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)";
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `⚠️ Engagement alert — @${username} dropped to ${engRate.toFixed(1)}%`,
    html: WRAP(`
      <div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:12px 16px;margin-bottom:20px;text-align:center;">
        <span style="color:${color};font-size:13px;font-weight:700;">⚠️ Engagement Rate: ${engRate.toFixed(1)}% (below ${threshold}% threshold)</span>
      </div>
      <h2 style="color:#292524;font-size:17px;margin-bottom:8px;">Hi ${name},</h2>
      <p style="color:#78614E;line-height:1.6;margin-bottom:12px;">
        The engagement rate for <strong>@${username}</strong> has dropped below your alert threshold of <strong>${threshold}%</strong>.
      </p>
      <div style="background:#FFF8ED;border-left:3px solid #F59E0B;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:16px;">
        <p style="margin:0 0 4px;color:#A8967E;font-size:11px;text-transform:uppercase;font-weight:600;">CURRENT AVERAGE ER (last 10 posts)</p>
        <p style="margin:0;color:${color};font-size:24px;font-weight:800;">${engRate.toFixed(2)}%</p>
      </div>
      ${topPost ? `
      <p style="color:#78614E;font-size:13px;margin-bottom:6px;"><strong>Best recent post:</strong></p>
      <div style="background:#FFFCF7;border:1px solid rgba(245,215,160,0.3);border-radius:8px;padding:10px 14px;margin-bottom:16px;">
        <p style="margin:0 0 4px;color:#292524;font-size:12px;">${topPost.caption ? topPost.caption.slice(0, 120) + (topPost.caption.length > 120 ? "…" : "") : "No caption"}</p>
        <p style="margin:0;color:#F59E0B;font-size:12px;font-weight:600;">ER: ${topPost.engRate.toFixed(2)}%</p>
      </div>
      ` : ""}
      <p style="color:#78614E;line-height:1.6;margin-bottom:4px;"><strong>Quick fixes to boost engagement:</strong></p>
      <ul style="padding-left:18px;margin-bottom:16px;">
        <li style="color:#78614E;margin-bottom:4px;">Post at peak hours (6PM–9PM in your audience's timezone)</li>
        <li style="color:#78614E;margin-bottom:4px;">Add a clear CTA: "Save this", "Tag someone", "Drop a 🔥"</li>
        <li style="color:#78614E;margin-bottom:4px;">Use Reels (30% higher reach than static posts)</li>
        <li style="color:#78614E;margin-bottom:4px;">Reply to all comments within the first hour</li>
      </ul>
      ${BTN("https://markethubpromo.com/instagram", "View Instagram Analytics")}
    `),
  });
}
