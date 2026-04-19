import { Resend } from "resend";

const FROM = "MarketHub Pro <noreply@markethubpromo.com>";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendWelcomeEmail(email: string, name: string) {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Welcome to MarketHub Pro!",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FFF8F0;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#F59E0B,#D97706);">
            <span style="color:white;font-size:22px;font-weight:bold;">M</span>
          </div>
          <h1 style="color:#292524;margin:12px 0 4px;font-size:22px;">MarketHub Pro</h1>
        </div>
        <h2 style="color:#292524;font-size:18px;margin-bottom:8px;">Welcome, ${name}!</h2>
        <p style="color:#78614E;line-height:1.6;margin-bottom:16px;">
          Your account has been created successfully. You now have access to analytics for YouTube, TikTok and Instagram — all in one place.
        </p>
        <p style="color:#78614E;line-height:1.6;margin-bottom:24px;">
          You're starting on the <strong>Free</strong> plan. If you want more data and channels, you can upgrade anytime.
        </p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="https://markethubpromo.com" style="display:inline-block;background:#F59E0B;color:#1C1814;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
            Open dashboard
          </a>
        </div>
        <p style="color:#C4AA8A;font-size:12px;text-align:center;margin:0;">
          © 2026 MarketHub Pro · <a href="https://markethubpromo.com/privacy" style="color:#F59E0B;">Privacy</a> · <a href="https://markethubpromo.com/terms" style="color:#F59E0B;">Terms</a>
        </p>
      </div>
    `,
  });
}

const PLAN_CONFIG: Record<string, {
  label: string; price: string; actions: string; model: string; color: string;
  features: string[]; startUrl: string;
  upsell?: { nextPlan: string; nextLabel: string; nextPrice: string; gains: string[] };
}> = {
  lite: {
    label: "Creator", price: "$24.00", actions: "20", model: "Standard AI", color: "#F59E0B",
    startUrl: "https://markethubpromo.com/lead-finder",
    features: ["20 Premium AI Actions/month", "Basic AI unlimited", "12 tracked channels", "2 Instagram accounts", "All 16 AI Agents", "Client Portal"],
    upsell: {
      nextPlan: "pro", nextLabel: "Pro", nextPrice: "$49/mo",
      gains: [
        "50 AI Actions/month (2.5× more — 30 extra scored leads per week)",
        "Premium AI Engine — noticeably better copy, research and strategy",
        "30 tracked channels (vs 12 now)",
        "4 Instagram accounts (vs 2 now)",
        "Power Workflows — multi-agent sequences in one click",
        "Priority Support — responses in under 4 hours",
      ],
    },
  },
  pro: {
    label: "Pro", price: "$49.00", actions: "50", model: "Premium AI ★", color: "#8B5CF6",
    startUrl: "https://markethubpromo.com/lead-finder",
    features: ["50 Premium AI Actions/month", "Premium AI (top model)", "30 tracked channels", "4 Instagram accounts", "All 16 AI Agents", "Power Workflows", "Priority Support"],
    upsell: {
      nextPlan: "business", nextLabel: "Studio", nextPrice: "$99/mo",
      gains: [
        "200 AI Actions/month (4× more — run full campaigns daily)",
        "100 tracked channels (vs 30 now) — manage a full client portfolio",
        "10 Instagram accounts (vs 4 now)",
        "20 client accounts — scale your agency without limits",
        "White Label Client Portal — your brand, not ours",
        "Full API Access — integrate MarketHub data into your own tools",
      ],
    },
  },
  business: {
    label: "Studio", price: "$99.00", actions: "200", model: "Premium AI ★", color: "#EC4899",
    startUrl: "https://markethubpromo.com/lead-finder",
    features: ["200 Premium AI Actions/month", "Premium AI (top model)", "100 tracked channels", "10 Instagram accounts", "API Access", "20 client accounts", "White Label"],
    upsell: {
      nextPlan: "agency", nextLabel: "Agency", nextPrice: "$249/mo",
      gains: [
        "1,000 AI Actions/month (5× more — unlimited daily operations)",
        "Unlimited channels, accounts, and client seats",
        "SLA 99.9% uptime guarantee — mission-critical reliability",
        "Dedicated priority support — your own response lane",
        "Full White Label on all features and portals",
      ],
    },
  },
  agency: {
    label: "Agency", price: "$249.00", actions: "1,000", model: "Premium AI ★", color: "#16A34A",
    startUrl: "https://markethubpromo.com/lead-finder",
    features: ["1,000 Premium AI Actions/month", "Premium AI (top model)", "Unlimited everything", "White Label", "Full API Access", "SLA 99.9%", "Priority Support"],
  },
};

export async function sendPaymentConfirmationEmail(
  email: string,
  name: string,
  plan: string,
  extra?: {
    amountPaid?: string;
    invoiceId?: string;
    invoicePdfUrl?: string;
    renewalDate?: string;
    subscriptionId?: string;
  }
) {
  const cfg = PLAN_CONFIG[plan] ?? PLAN_CONFIG.lite;
  const invoiceId = extra?.invoiceId ?? "—";
  const amountPaid = extra?.amountPaid ?? cfg.price;
  const renewalDate = extra?.renewalDate ?? "Next month";
  const invoicePdfUrl = extra?.invoicePdfUrl ?? null;
  const now = new Date().toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" });

  const featureRows = cfg.features.map(f =>
    `<tr><td style="padding:5px 0;font-size:13px;color:#78614E;">✓ ${f}</td></tr>`
  ).join("");

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `🎉 ${cfg.label} plan activated — Payment receipt #${invoiceId.slice(-8).toUpperCase()}`,
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#FFF8F0;border-radius:16px;overflow:hidden;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#F59E0B,#D97706);padding:28px 32px;text-align:center;">
    <div style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,0.2);margin-bottom:12px;">
      <span style="color:white;font-size:26px;font-weight:bold;">M</span>
    </div>
    <h1 style="color:white;margin:0 0 4px;font-size:22px;font-weight:800;">MarketHub Pro</h1>
    <p style="color:rgba(255,255,255,0.85);margin:0;font-size:13px;">Payment confirmed ✓</p>
  </div>

  <!-- Body -->
  <div style="padding:32px;">

    <h2 style="color:#292524;font-size:19px;margin:0 0 6px;">Hi ${name}!</h2>
    <p style="color:#78614E;line-height:1.6;margin:0 0 24px;">
      Your <strong>${cfg.label}</strong> subscription is now active. Here's your payment receipt and everything you now have access to.
    </p>

    <!-- Invoice Box -->
    <div style="background:#FFFCF7;border:1px solid rgba(245,215,160,0.6);border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#A8967E;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 14px;">PAYMENT RECEIPT</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid rgba(245,215,160,0.4);">
          <td style="padding:8px 0;font-size:13px;color:#78614E;">Invoice ID</td>
          <td style="padding:8px 0;font-size:13px;color:#292524;text-align:right;font-family:monospace;">#${invoiceId.slice(-12).toUpperCase()}</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(245,215,160,0.4);">
          <td style="padding:8px 0;font-size:13px;color:#78614E;">Date</td>
          <td style="padding:8px 0;font-size:13px;color:#292524;text-align:right;">${now}</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(245,215,160,0.4);">
          <td style="padding:8px 0;font-size:13px;color:#78614E;">Plan</td>
          <td style="padding:8px 0;font-size:13px;color:#292524;text-align:right;font-weight:700;">${cfg.label}</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(245,215,160,0.4);">
          <td style="padding:8px 0;font-size:13px;color:#78614E;">AI Engine</td>
          <td style="padding:8px 0;font-size:13px;color:${cfg.color};text-align:right;font-weight:600;">${cfg.model}</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(245,215,160,0.4);">
          <td style="padding:8px 0;font-size:13px;color:#78614E;">Billing cycle</td>
          <td style="padding:8px 0;font-size:13px;color:#292524;text-align:right;">Monthly</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(245,215,160,0.4);">
          <td style="padding:8px 0;font-size:13px;color:#78614E;">Next renewal</td>
          <td style="padding:8px 0;font-size:13px;color:#292524;text-align:right;">${renewalDate}</td>
        </tr>
        <tr>
          <td style="padding:12px 0 0;font-size:15px;color:#292524;font-weight:800;">Total paid</td>
          <td style="padding:12px 0 0;font-size:20px;color:#16A34A;text-align:right;font-weight:800;">${amountPaid}</td>
        </tr>
      </table>
      ${invoicePdfUrl ? `
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(245,215,160,0.4);">
        <a href="${invoicePdfUrl}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#F59E0B;font-weight:600;text-decoration:none;">
          📄 Download PDF Invoice
        </a>
      </div>` : ""}
    </div>

    <!-- What you have now -->
    <div style="background:#FFFCF7;border:1px solid rgba(245,215,160,0.4);border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#A8967E;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">WHAT YOU NOW HAVE ACCESS TO</p>
      <table style="width:100%;border-collapse:collapse;">
        ${featureRows}
      </table>
    </div>

    <!-- First step CTA -->
    <div style="background:rgba(${cfg.color === '#8B5CF6' ? '139,92,246' : cfg.color === '#EC4899' ? '236,72,153' : cfg.color === '#16A34A' ? '22,163,74' : '245,158,11'},0.06);border:1px solid rgba(${cfg.color === '#8B5CF6' ? '139,92,246' : cfg.color === '#EC4899' ? '236,72,153' : cfg.color === '#16A34A' ? '22,163,74' : '245,158,11'},0.2);border-radius:12px;padding:18px;margin-bottom:24px;text-align:center;">
      <p style="color:#292524;font-size:14px;font-weight:700;margin:0 0 4px;">Ready to find your first clients?</p>
      <p style="color:#78614E;font-size:13px;margin:0 0 14px;">Start with the AI Lead Finder — describe your offer and get 50+ scored leads.</p>
      <a href="${cfg.startUrl}" style="display:inline-block;background:#F59E0B;color:#1C1814;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
        Open Lead Finder →
      </a>
    </div>

    ${cfg.upsell ? `
    <!-- Upsell -->
    <div style="background:#FFFCF7;border:1px solid rgba(245,215,160,0.5);border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#A8967E;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">WANT MORE RESULTS?</p>
      <p style="color:#292524;font-size:14px;font-weight:700;margin:0 0 12px;">
        Upgrade to <strong>${cfg.upsell.nextLabel}</strong> at <strong>${cfg.upsell.nextPrice}</strong> and unlock:
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
        ${cfg.upsell.gains.map(g => `<tr><td style="padding:4px 0;font-size:13px;color:#78614E;">🚀 ${g}</td></tr>`).join("")}
      </table>
      <a href="https://markethubpromo.com/pricing" style="display:inline-block;background:#292524;color:white;font-weight:700;padding:10px 22px;border-radius:8px;text-decoration:none;font-size:13px;">
        Upgrade to ${cfg.upsell.nextLabel} →
      </a>
    </div>
    ` : ""}

    <!-- Support -->
    <p style="color:#A8967E;font-size:13px;text-align:center;margin:0 0 8px;">
      Questions about your subscription? We're here.
    </p>
    <p style="text-align:center;margin:0 0 24px;">
      <a href="mailto:support@markethubpromo.com" style="color:#F59E0B;font-size:13px;font-weight:600;">support@markethubpromo.com</a>
    </p>

    <!-- Manage -->
    <p style="color:#C4AA8A;font-size:11px;text-align:center;margin:0;">
      Manage your subscription →
      <a href="https://markethubpromo.com/settings?tab=credits" style="color:#F59E0B;">Settings → Billing</a>
      &nbsp;·&nbsp;
      <a href="https://markethubpromo.com/privacy" style="color:#F59E0B;">Privacy</a>
      &nbsp;·&nbsp;
      <a href="https://markethubpromo.com/terms" style="color:#F59E0B;">Terms</a>
    </p>
    <p style="color:#C4AA8A;font-size:10px;text-align:center;margin:8px 0 0;">© ${new Date().getFullYear()} MarketHub Pro. All rights reserved.</p>
  </div>
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
    subject: "Your subscription has been cancelled — MarketHub Pro",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FFF8F0;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#F59E0B,#D97706);">
            <span style="color:white;font-size:22px;font-weight:bold;">M</span>
          </div>
          <h1 style="color:#292524;margin:12px 0 4px;font-size:22px;">MarketHub Pro</h1>
        </div>
        <h2 style="color:#292524;font-size:18px;margin-bottom:8px;">Subscription cancelled</h2>
        <p style="color:#78614E;line-height:1.6;margin-bottom:16px;">
          Hi ${name}, your subscription has been cancelled. Your account has been moved back to the <strong>Free</strong> plan.
        </p>
        <p style="color:#78614E;line-height:1.6;margin-bottom:24px;">
          If you changed your mind or cancelled by mistake, you can reactivate anytime from the Upgrade section.
        </p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="https://markethubpromo.com/upgrade" style="display:inline-block;background:#F59E0B;color:#1C1814;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
            Reactivate subscription
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
    subject: `Your trial expires in ${daysLeft} ${daysLeft === 1 ? "day" : "days"} — MarketHub Pro`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FFF8F0;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#F59E0B,#D97706);">
            <span style="color:white;font-size:22px;font-weight:bold;">M</span>
          </div>
          <h1 style="color:#292524;margin:12px 0 4px;font-size:22px;">MarketHub Pro</h1>
        </div>
        <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:14px 16px;margin-bottom:20px;text-align:center;">
          <span style="font-size:13px;font-weight:700;color:#D97706;">⏳ ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left on your trial</span>
        </div>
        <h2 style="color:#292524;font-size:17px;margin-bottom:8px;">Hi, ${name}!</h2>
        <p style="color:#78614E;line-height:1.6;margin-bottom:20px;">
          Your free 14-day trial is about to expire. Don't lose access to analytics, AI tools and all your connected data.
        </p>
        <p style="color:#78614E;line-height:1.6;margin-bottom:24px;">
          Pick a plan and keep going without interruptions — without losing anything you've already configured.
        </p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="https://markethubpromo.com/upgrade" style="display:inline-block;background:#F59E0B;color:#1C1814;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
            Pick a plan now
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
    subject: "Your trial has expired — MarketHub Pro",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#FFF8F0;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#F59E0B,#D97706);">
            <span style="color:white;font-size:22px;font-weight:bold;">M</span>
          </div>
          <h1 style="color:#292524;margin:12px 0 4px;font-size:22px;">MarketHub Pro</h1>
        </div>
        <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px 16px;margin-bottom:20px;text-align:center;">
          <span style="font-size:13px;font-weight:700;color:#dc2626;">Trial expired</span>
        </div>
        <h2 style="color:#292524;font-size:17px;margin-bottom:8px;">Hi, ${name},</h2>
        <p style="color:#78614E;line-height:1.6;margin-bottom:20px;">
          Your free 14-day trial has ended. Access to analytics and AI tools is currently restricted.
        </p>
        <p style="color:#78614E;line-height:1.6;margin-bottom:24px;">
          Activate a paid plan to regain full access to all your data and features.
        </p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="https://markethubpromo.com/upgrade-required" style="display:inline-block;background:#F59E0B;color:#1C1814;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
            Reactivate account
          </a>
        </div>
        <p style="color:#A8967E;font-size:12px;text-align:center;margin-bottom:8px;">
          Got questions? Write to us at <a href="mailto:support@markethubpromo.com" style="color:#F59E0B;">support@markethubpromo.com</a>
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
