import FaqItem from "../promo/FaqItem";
import HelpForm from "./HelpForm";
import Link from "next/link";

export const metadata = {
  title: "Help & Support — MarketHub Pro",
  description: "Get help with MarketHub Pro — FAQ, guides, and contact form. We respond within 24 hours.",
};

const C = {
  bg: "#FFF8F0",
  card: "#FFFCF7",
  amber: "#F59E0B",
  amberDark: "#D97706",
  amberBorder: "rgba(245,215,160,0.4)",
  text: "#292524",
  muted: "#78614E",
};

const HELP_FAQS = [
  {
    q: "How do I schedule a post for a specific time?",
    a: "Go to Calendar → New post. Set the date and time, choose the platform, and set the Status dropdown to 'Scheduled'. The cron runs every 5 minutes via GitHub Actions, so your post publishes at the target time within a 5-minute window.",
  },
  {
    q: "Why can't I see Instagram analytics even though I connected my account?",
    a: "Instagram requires a Business or Creator account linked to a Facebook Page. Personal IG accounts don't have Graph API access. Go to Settings → Integrations → reconnect Instagram, making sure the account type is Business.",
  },
  {
    q: "My LinkedIn post failed — why?",
    a: "LinkedIn requires the 'Share on LinkedIn' and 'Sign In with LinkedIn using OpenID Connect' products to be activated in your LinkedIn Developer app. Check linkedin.com/developers/apps → your app → Products tab.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Go to Dashboard → Plan & Billing → Manage subscription. You'll be redirected to the Stripe customer portal where you can cancel anytime. Your plan remains active until the end of the current billing period.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. Go to Settings → Privacy → 'Export my data' to download a JSON bundle of everything we store about you. This is your GDPR Article 15 right.",
  },
  {
    q: "How do I delete my account?",
    a: "Settings → Privacy → 'Delete my account'. You'll have to confirm by typing your email. This is permanent — all data is erased (GDPR Article 17). Any active Stripe subscription is cancelled first.",
  },
  {
    q: "What's the free trial limitation?",
    a: "Free trial accounts get 7 days of access to everything on the Pro plan. After day 7, your account transitions to 'expired' status and you'll be prompted to upgrade.",
  },
  {
    q: "The AI agent isn't responding — what do I check?",
    a: "First: is ANTHROPIC_API_KEY configured? (Admin → check environment). Second: are you on a plan that allows AI Hub access? (Lite and above). Third: try a different agent — if only one is broken, it may be a prompt or model issue.",
  },
];

export default function HelpPage() {
  return (
    <div style={{ backgroundColor: C.bg, color: C.text, minHeight: "100vh", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {/* Header */}
      <div style={{ backgroundColor: C.card, borderBottom: `1px solid ${C.amberBorder}` }} className="px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: C.text }}>Help & Support</h1>
            <p className="text-sm mt-1" style={{ color: C.muted }}>FAQs, guides, and a direct line to us.</p>
          </div>
          <Link href="/" className="text-sm font-semibold" style={{ color: C.amberDark }}>← Back to app</Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">
        {/* FAQs */}
        <section>
          <h2 className="text-lg font-bold mb-4" style={{ color: C.text }}>Frequently asked questions</h2>
          <div style={{ backgroundColor: C.card, border: `1px solid ${C.amberBorder}`, borderRadius: 12 }} className="px-5 py-2">
            {HELP_FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </section>

        {/* Contact form */}
        <section>
          <h2 className="text-lg font-bold mb-2" style={{ color: C.text }}>Still need help? Contact us</h2>
          <p className="text-sm mb-4" style={{ color: C.muted }}>
            We respond within 24 hours. You can also email us directly at{" "}
            <a href="mailto:markethub973@gmail.com" style={{ color: C.amberDark, fontWeight: 600 }}>
              markethub973@gmail.com
            </a>
          </p>
          <HelpForm />
        </section>
      </div>
    </div>
  );
}
