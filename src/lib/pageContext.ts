/**
 * Page-aware context for the in-app AI agent chat. Maps current pathname
 * to a human-readable description of the page the user is on, what it does,
 * and what fields / actions / data are relevant. This block gets prepended
 * to the agent system prompt so the LLM answers questions like "how do I
 * schedule this?" without having to ask which page the user is on.
 */

export interface PageContext {
  name: string;
  description: string;
  actions?: string[];
}

const EXACT: Record<string, PageContext> = {
  "/dashboard": {
    name: "Dashboard",
    description: "Main overview with key stats, onboarding checklist, recent activity, top videos, and charts. First page after login.",
    actions: ["View platform stats", "Complete onboarding", "Quick navigate to any module"],
  },
  "/dashboard/billing": {
    name: "Plan & Billing",
    description: "Current plan, Stripe subscription status, upgrade options, invoices. Entry point for plan changes.",
    actions: ["Upgrade plan", "Download invoices", "Cancel subscription", "Change payment method"],
  },
  "/settings": {
    name: "Settings",
    description: "User profile, integrations (Instagram, YouTube, TikTok, Facebook Page, LinkedIn, Google Drive), notification preferences, security.",
    actions: ["Connect social accounts", "Update profile", "Manage API keys", "Notification preferences"],
  },
  "/integrations": {
    name: "Integrations",
    description: "Overview of all connected third-party services (Instagram, Meta, Google, LinkedIn, TikTok, Stripe, Resend). Shows connection status and last sync.",
  },
  "/ai-hub": {
    name: "AI Hub",
    description: "Central workspace for all 16 specialized AI agents: Support, Deep Research, Email Marketing, Financial Analysis, Campaign Brainstorming, Prompt Factory, Brand, Competitive Ads, Pricing Strategist, Ad Copy Creator, Copywriter, Landing Page Writer, SEO Optimizer, Blog Writer, Social Media Creator, Market Researcher. Each agent has its own specialized prompt.",
    actions: ["Pick an agent by use case", "Start a chat with any agent", "Export agent output"],
  },
  "/calendar": {
    name: "Content Calendar",
    description: "Schedule social media posts across Instagram, LinkedIn, Facebook, TikTok. Posts with status=scheduled are auto-published by the cron at their date/time. Manual 'Publish Now' also available per post.",
    actions: ["Create post", "Schedule post", "Publish now", "Change status (draft/scheduled/published)", "Add image URL", "Filter by platform"],
  },
  "/instagram": {
    name: "Instagram Analytics",
    description: "Multi-account Instagram Business analytics. Shows followers, posts, engagement rate, comparison between connected accounts. Data comes via Meta Graph API.",
    actions: ["Switch between connected accounts", "Refresh data", "Compare accounts", "View top posts"],
  },
  "/linkedin": {
    name: "LinkedIn Account",
    description: "Status view of connected LinkedIn account. Shows user profile (name, email, picture). Only scope available via OAuth is openid+profile+email+w_member_social. Used for auto-publishing posts from Calendar.",
    actions: ["Connect LinkedIn", "Disconnect LinkedIn", "Open Calendar for posting"],
  },
  "/tiktok": {
    name: "TikTok Analytics",
    description: "TikTok account analytics. Connected via TikTok for Developers OAuth.",
  },
  "/youtube": {
    name: "YouTube Analytics",
    description: "YouTube channel analytics via YouTube Data API.",
  },
  "/lead-finder": {
    name: "AI Lead Finder",
    description: "AI-powered prospecting tool that finds 50+ qualified business leads per week based on the user's industry, location, and criteria. Uses Apify + Claude for enrichment.",
    actions: ["Start a new search", "Review found leads", "Export leads", "Save to CRM"],
  },
  "/leads": {
    name: "Leads",
    description: "CRM-style list of all leads found via Lead Finder or imported via CSV. Each lead has contact info, pipeline status, notes.",
    actions: ["Filter leads", "Update pipeline status", "Export CSV", "Import CSV"],
  },
  "/clients": {
    name: "Clients",
    description: "Agency client management. Each client has MRR, payment status, contracts, onboarding progress.",
    actions: ["Add client", "Update MRR", "Generate invoice", "Send onboarding emails"],
  },
  "/influencers": {
    name: "Influencers",
    description: "Database of influencers with niche, location, followers, contact info. Can be enriched from Instagram via Graph API.",
    actions: ["Add influencer", "Enrich from Instagram", "Filter by niche"],
  },
  "/campaigns": {
    name: "Campaigns",
    description: "Marketing campaigns with budget, timeline, platforms, KPIs. Stored in Supabase.",
    actions: ["Create campaign", "Assign client", "Track metrics"],
  },
  "/competitors": {
    name: "Competitors",
    description: "Competitor analysis — tracks competitor social media performance across platforms.",
  },
  "/research": {
    name: "Deep Research",
    description: "Structured research workflow. Runs Claude-powered research on a topic with methodology and output.",
  },
  "/captions": {
    name: "Caption Generator",
    description: "AI caption generation for social media posts. Pick tone, length, platform, hashtags.",
  },
  "/hashtags": {
    name: "Hashtag Sets",
    description: "Create and save reusable hashtag sets per niche/campaign.",
  },
  "/proposals": {
    name: "Proposal Generator",
    description: "Generate client proposals as PDF or HTML. Define services, pricing, terms.",
  },
  "/time-tracking": {
    name: "Time Tracking",
    description: "Track hours worked per client / project. Live timer + manual entries + monthly reports.",
  },
  "/affiliate": {
    name: "Affiliate Hub",
    description: "Create and track affiliate links with click counters.",
  },
  "/assets": {
    name: "Assets & Storage",
    description: "Upload files to Supabase Storage or sync with Google Drive. Shared across the platform.",
  },
  "/email-campaigns": {
    name: "Email Campaigns",
    description: "Design and send email campaigns via Resend. HTML editor, batch send, preview.",
  },
  "/social-listening": {
    name: "Social Listening",
    description: "Monitor mentions of keywords across TikTok, Instagram, Reddit, and News. Daily scan.",
  },
  "/trending-alerts": {
    name: "Trending Alerts",
    description: "Daily alerts about trending products/topics on TikTok based on user keywords.",
  },
  "/roi-calculator": {
    name: "ROI Calculator",
    description: "Calculate and export marketing ROI reports.",
  },
  "/referral": {
    name: "Referral",
    description: "Referral program. User gets a unique code, invites others via email, tracks signups.",
  },
  "/white-label": {
    name: "White-Label Settings",
    description: "Agency branding for client portal: logo, agency name, accent color.",
  },
  "/api-keys": {
    name: "External API Keys",
    description: "Generate and manage external API keys (Business/Enterprise plans only). Keys are SHA-256 hashed with mhp_ prefix.",
  },
  "/team": {
    name: "Team Collaboration",
    description: "Invite team members with roles: Admin, Editor, Viewer.",
  },
  "/monthly-report": {
    name: "Monthly Report",
    description: "Monthly performance report per client. Sent automatically via cron on day 1 of each month.",
  },
  "/dashboard/admin": {
    name: "Admin Dashboard",
    description: "Admin-only control panel. Shows all users, security events, cron logs, platform config, audit logs.",
    actions: ["View all users", "Change user plan", "Block user", "View security events", "Run migration"],
  },
  "/dashboard/admin/users": {
    name: "Admin Users",
    description: "Admin view of all registered users with plan, status, trial dates.",
  },
};

// Prefix matches (for dynamic routes like /dashboard/admin/*)
const PREFIX: Array<{ prefix: string; ctx: PageContext }> = [
  {
    prefix: "/dashboard/admin/",
    ctx: {
      name: "Admin section",
      description: "Administrator-only area. User has admin access to platform internals.",
    },
  },
];

export function getPageContext(pathname: string): PageContext | null {
  if (EXACT[pathname]) return EXACT[pathname];
  for (const { prefix, ctx } of PREFIX) {
    if (pathname.startsWith(prefix)) return ctx;
  }
  return null;
}

// Short serialized form to prepend to an agent system prompt.
export function pageContextBlock(pathname: string | undefined | null): string {
  if (!pathname) return "";
  const ctx = getPageContext(pathname);
  if (!ctx) {
    return `\n\n## Current page: ${pathname}\nThe user is on a page we don't have rich context for. Answer generically or ask for clarification if needed.\n`;
  }
  const actions = ctx.actions?.length
    ? `\nKey actions available: ${ctx.actions.join("; ")}.`
    : "";
  return `\n\n## Current page: ${pathname} — ${ctx.name}\n${ctx.description}${actions}\n`;
}
