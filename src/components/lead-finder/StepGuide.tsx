"use client";

import { CheckCircle2, Circle, ArrowRight, Lightbulb } from "lucide-react";

const AMBER = "var(--color-primary)";
const GREEN = "#1DB954";

interface StepAction {
  label: string;
  detail: string;
  done?: boolean;
}

interface StepConfig {
  title: string;
  subtitle: string;
  actions: StepAction[];
  next: string;
  tip: string;
}

const STEP_CONFIGS: Record<number, (ctx: StepGuideContext) => StepConfig> = {
  1: (ctx) => ({
    title: "Define what you sell",
    subtitle: "The more specific you are, the better leads the AI finds",
    actions: [
      { label: "Select the offer type", detail: "Service, physical product, food, affiliate, app, etc.", done: !!ctx.offerType },
      { label: "Describe the offer in 1-2 sentences", detail: "Include what you do, for whom, where — be concrete, not generic", done: ctx.offerText.trim().length > 20 },
      { label: "Mention your differentiator", detail: "What do you have over competitors? Price, quality, uniqueness?", done: ctx.offerText.trim().length > 60 },
    ],
    next: "Define the target audience",
    tip: ctx.offerType === "food_beverage"
      ? "Food sells visually — prepare quality photos for the campaign"
      : ctx.offerType === "affiliate"
      ? "With affiliate, transparency beats everything — disclose that you're promoting"
      : ctx.offerType === "software"
      ? "For apps/SaaS, a short video demo beats any text"
      : "Offers with concrete testimonials convert 3x better",
  }),

  2: (ctx) => ({
    title: "Define your ideal audience",
    subtitle: "Wrong targeting = wasted money — be precise",
    actions: [
      { label: "Choose customer type (B2C/B2B/Both)", detail: "B2C = individuals, B2B = companies. The message differs completely", done: !!ctx.audienceType },
      { label: "Set the location", detail: "City, region or country — affects sources and messaging", done: !!ctx.location },
      { label: "Choose customer budget range", detail: "Knowing their budget tells you how to communicate value", done: !!ctx.budgetRange },
    ],
    next: "Select AI search sources",
    tip: ctx.audienceType === "b2b"
      ? "B2B: LinkedIn + Google + cold email beat Facebook and TikTok for company prospects"
      : "B2C: Facebook Groups + Marketplace + Google Maps are the richest sources for local leads",
  }),

  3: (ctx) => ({
    title: "Select your search sources",
    subtitle: "AI picked the optimal sources — you can adjust them manually",
    actions: [
      { label: "Check the AI-activated sources", detail: "Each source has a match score — activate the ones with high intent", done: true },
      { label: "Adjust search queries", detail: "You can manually edit keywords per source — be specific about location and event", done: false },
      { label: "Choose max 3-5 sources", detail: "Too many sources = noisy data. Quality > quantity", done: false },
    ],
    next: "Analyze and score the leads",
    tip: "Google + Facebook Groups + Marketplace is the combo that brings the best ROI",
  }),

  4: (ctx) => ({
    title: "Analyze the leads found",
    subtitle: ctx.leadsCount > 0 ? `${ctx.leadsCount} prospects found — filter and pick` : "Search in progress…",
    actions: [
      { label: "Filter by score (HOT > WARM > COLD)", detail: "Focus on HOT and WARM leads — cold leads cost a lot of time", done: ctx.leadsCount > 0 },
      { label: "Open the sources and check context", detail: "Click each lead's link to see the real context", done: false },
      { label: "Save the best leads to the CRM", detail: "Saved HOT leads = an active pipeline you can follow up on", done: false },
    ],
    next: "Create the personalized outreach message",
    tip: ctx.leadsCount > 0
      ? `Out of ${ctx.leadsCount} leads, focus on the top ${Math.min(5, ctx.leadsCount)} — quality beats quantity`
      : "If you can't find leads, change the query or source — not the offer",
  }),

  5: (_ctx) => ({
    title: "Outreach & Full campaign",
    subtitle: "Personalized message + 9 AI-generated marketing assets",
    actions: [
      { label: "Copy the outreach message and send", detail: "Use the recommended platform — don't send the same message everywhere", done: false },
      { label: "Fill in your contact details", detail: "Phone, email, website, WhatsApp — they get embedded in all campaign assets", done: false },
      { label: "Generate the full campaign (9 assets)", detail: "SMS, Email, WhatsApp, Facebook, Instagram, TikTok, Landing page, Video brief, Photo brief", done: false },
    ],
    next: "Send, track replies, re-target",
    tip: "Don't send the same message to 50 people. 10 personalized messages beat 200 generic ones.",
  }),
};

interface StepGuideContext {
  offerType: string;
  offerText: string;
  audienceType: string;
  location: string;
  budgetRange: string;
  leadsCount: number;
}

interface Props extends StepGuideContext {
  step: number;
}

export default function StepGuide({ step, offerType, offerText, audienceType, location, budgetRange, leadsCount }: Props) {
  const ctx: StepGuideContext = { offerType, offerText, audienceType, location, budgetRange, leadsCount };
  const config = STEP_CONFIGS[step]?.(ctx);
  if (!config) return null;

  const doneCount = config.actions.filter(a => a.done).length;
  const progress = Math.round((doneCount / config.actions.length) * 100);

  return (
    <div className="rounded-2xl p-4 space-y-3"
      style={{ backgroundColor: "rgba(245,215,160,0.04)", border: "1px solid rgba(245,215,160,0.12)" }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold" style={{ color: AMBER }}>Step {step}/5 guide</p>
          <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{config.title}</p>
          <p className="text-xs" style={{ color: "#A8967E" }}>{config.subtitle}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: `conic-gradient(${AMBER} ${progress * 3.6}deg, rgba(245,215,160,0.15) 0deg)`,
              color: "var(--color-text)",
            }}>
            {progress}%
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {config.actions.map((action, i) => (
          <div key={i} className="flex items-start gap-2.5">
            {action.done
              ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
              : <Circle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "rgba(245,215,160,0.3)" }} />}
            <div>
              <p className="text-xs font-semibold" style={{ color: action.done ? GREEN : "var(--color-text)" }}>{action.label}</p>
              <p className="text-xs" style={{ color: "#A8967E" }}>{action.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tip */}
      <div className="rounded-lg px-3 py-2 flex gap-2"
        style={{ backgroundColor: `${AMBER}08`, border: `1px solid ${AMBER}20` }}>
        <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: AMBER }} />
        <p className="text-xs" style={{ color: "#78614E", lineHeight: 1.6 }}>{config.tip}</p>
      </div>

      {/* Next step */}
      <div className="flex items-center gap-2">
        <ArrowRight className="w-3.5 h-3.5" style={{ color: "rgba(245,215,160,0.4)" }} />
        <p className="text-xs" style={{ color: "#A8967E" }}>Next: <span className="font-semibold" style={{ color: "#78614E" }}>{config.next}</span></p>
      </div>
    </div>
  );
}
