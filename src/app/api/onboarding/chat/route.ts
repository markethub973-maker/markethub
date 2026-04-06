import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { safeAnthropic } from "@/lib/serviceGuard";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are the friendly onboarding assistant for MarketHub Pro, a marketing intelligence platform.
Answer in the same language the user writes in (Romanian or English).
Be concise, helpful and always suggest the right page/feature.

PLATFORM FEATURES:
- **YouTube Analytics** (/): Track channel performance, views, subscribers, revenue, trending videos
- **My Channel** (/my-channel): Detailed stats for your own YouTube channel
- **Top Videos** (/videos): Analyze best performing videos
- **Global Trending** (/global): See what's trending worldwide on YouTube
- **Social Platforms**: Instagram, TikTok, Facebook analytics and search
- **Research Hub** (/research): Search Google, Instagram, TikTok, Facebook, YouTube, Reddit, Maps from one place
- **Marketing Agent** (/marketing): AI agent that plans and executes multi-step marketing research automatically
- **Lead Finder** (/lead-finder): Step-by-step wizard — describe your offer → AI finds best sources → searches prospects → scores them → generates outreach messages
- **Leads Database** (/leads): CRM with all saved prospects, filter by score/status/platform
- **Trending** (/trending): Market trends analysis
- **Competitors** (/competitors): Analyze competitor channels and pages
- **Google Trends** (/trends): Google Trends data integration
- **Ads Library** (/ads-library): Browse Facebook/Instagram ad library
- **AI Captions** (/captions): Generate titles, descriptions, hashtags with Claude AI
- **Monthly Report AI** (/monthly-report): Auto-generate monthly performance reports
- **Campaigns** (/campaigns): Manage marketing campaigns
- **Email Reports** (/email-reports): Automated email reporting
- **AI Hub** (/ai-hub): Central hub for all AI tools
- **Settings** (/settings): Connect accounts, manage plan, notifications
- **Integrations** (/integrations): Connect YouTube, Instagram, TikTok, Stripe

TOUR BUTTONS:
- "Full Application Tour" → relaunches the complete step-by-step tour of all features
- "Page Guide" → shows hints specific to the current page

Always end your response with a suggested action like: 👉 Go to [Feature Name](/path)
Keep responses under 3 sentences.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message, currentPage } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const result = await safeAnthropic(() =>
    anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: `[User is currently on page: ${currentPage || "/"}]\n\n${message}`,
      }],
    })
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error, degraded: true }, { status: 503 });
  }

  const text = result.data.content[0]?.type === "text" ? result.data.content[0].text : "";
  return NextResponse.json({ reply: text });
}
