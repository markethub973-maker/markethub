import { createClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────

export type AgentType = "campaign" | "research" | "content" | "analytics" | "client";
export type WorkflowMode = "auto" | "semi" | "guided";

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  tool: string;
  status: "pending" | "active" | "completed" | "skipped";
  result?: unknown;
}

export interface AgentDefinition {
  name: string;
  icon: string;
  color: string;
  description: string;
  steps: Array<{
    id: string;
    name: string;
    description: string;
    tool: string;
  }>;
}

export interface WorkflowSession {
  id: string;
  user_id: string;
  project_id: string;
  agent_type: AgentType;
  mode: WorkflowMode;
  steps: WorkflowStep[];
  current_step: number;
  status: "active" | "completed" | "abandoned";
  result?: unknown;
  created_at: string;
  updated_at: string;
}

// ── Agent Definitions ──────────────────────────────────────────────────────

export const AGENT_DEFINITIONS: Record<AgentType, AgentDefinition> = {
  campaign: {
    name: "Campaign Agent",
    icon: "\uD83D\uDE80",
    color: "#F59E0B",
    description: "End-to-end campaign: research, content, publish, report",
    steps: [
      { id: "research", name: "Market Research", description: "Search for trending topics and competitor strategies in your niche", tool: "/api/brain/web-search" },
      { id: "sound", name: "Find Trending Sound", description: "Discover viral sounds and audio trends on TikTok/Reels", tool: "/api/tiktok/sounds" },
      { id: "caption", name: "Generate Captions", description: "Create platform-optimized captions with hooks, CTAs and hashtags", tool: "/api/ai/caption" },
      { id: "image", name: "Generate Images", description: "Create scroll-stopping visuals using AI image generation", tool: "/api/studio/image" },
      { id: "calendar", name: "Schedule Posts", description: "Add content to the publishing calendar with optimal timing", tool: "/api/calendar" },
      { id: "publish", name: "Publish", description: "Push scheduled posts live to all connected platforms", tool: "/api/calendar/publish" },
      { id: "analytics", name: "Track Results", description: "Monitor engagement, reach and conversion metrics", tool: "/api/instagram/insights" },
      { id: "report", name: "Generate Report", description: "Compile performance data into a client-ready email report", tool: "/api/email/send-report" },
    ],
  },
  research: {
    name: "Research Agent",
    icon: "\uD83D\uDD0D",
    color: "#8B5CF6",
    description: "Deep-dive research: competitors, trends, audience insights",
    steps: [
      { id: "web-search", name: "Web Search", description: "Search the web for industry trends, news and competitor activity", tool: "/api/brain/web-search" },
      { id: "competitor-scan", name: "Competitor Scan", description: "Analyze competitor social profiles, content strategy and engagement", tool: "/api/ai/competitor-scan" },
      { id: "hashtag-scan", name: "Hashtag Analysis", description: "Find high-performing hashtags by reach, competition and relevance", tool: "/api/ai/hashtag-scan" },
      { id: "content-gap", name: "Content Gap Analysis", description: "Identify untapped content opportunities your competitors are missing", tool: "/api/ai/content-gap" },
      { id: "sentiment", name: "Sentiment Analysis", description: "Gauge audience sentiment around your brand and key topics", tool: "/api/ai/sentiment" },
      { id: "summary", name: "Research Summary", description: "Compile all findings into an actionable insights document", tool: "/api/ai/caption" },
    ],
  },
  content: {
    name: "Content Agent",
    icon: "\u270D\uFE0F",
    color: "#10B981",
    description: "Full content pipeline: ideate, write, design, optimize",
    steps: [
      { id: "strategy", name: "Content Strategy", description: "Define content pillars, themes and posting frequency", tool: "/api/ai/content-strategy" },
      { id: "hooks", name: "Generate Hooks", description: "Create attention-grabbing opening lines and scroll-stoppers", tool: "/api/ai/hooks" },
      { id: "caption", name: "Write Captions", description: "Draft platform-specific captions with brand voice consistency", tool: "/api/ai/caption" },
      { id: "image", name: "Create Visuals", description: "Generate on-brand images and graphics using AI", tool: "/api/studio/image" },
      { id: "ab-titles", name: "A/B Title Variants", description: "Generate multiple title variations for split testing", tool: "/api/ai/ab-titles" },
      { id: "hashtags", name: "Optimize Hashtags", description: "Select the best hashtag mix for maximum discoverability", tool: "/api/ai/hashtags" },
      { id: "schedule", name: "Schedule Content", description: "Place finalized content on the calendar at best engagement times", tool: "/api/calendar" },
    ],
  },
  analytics: {
    name: "Analytics Agent",
    icon: "\uD83D\uDCCA",
    color: "#3B82F6",
    description: "Performance tracking: metrics, reports, predictions",
    steps: [
      { id: "instagram", name: "Instagram Insights", description: "Pull reach, impressions, saves and engagement rate from Instagram", tool: "/api/instagram/insights" },
      { id: "tiktok", name: "TikTok Analytics", description: "Gather views, shares, comments and follower growth from TikTok", tool: "/api/tiktok/analytics" },
      { id: "engagement", name: "Engagement Prediction", description: "Predict future engagement based on historical patterns", tool: "/api/ai/engagement-predict" },
      { id: "best-time", name: "Best Time Analysis", description: "Calculate optimal posting times per platform and audience", tool: "/api/ai/best-time" },
      { id: "sentiment", name: "Audience Sentiment", description: "Analyze comment sentiment and brand perception trends", tool: "/api/ai/sentiment" },
      { id: "pdf-report", name: "PDF Report", description: "Generate a branded PDF report with charts and key metrics", tool: "/api/reports/pdf" },
      { id: "email-report", name: "Email Report", description: "Send the performance report directly to clients via email", tool: "/api/email/send-report" },
    ],
  },
  client: {
    name: "Client Agent",
    icon: "\uD83E\uDD1D",
    color: "#EC4899",
    description: "Client management: onboard, communicate, report",
    steps: [
      { id: "lead-find", name: "Find Prospects", description: "Search for potential client leads matching your ideal profile", tool: "/api/ai/lead-finder" },
      { id: "lead-enrich", name: "Enrich Lead Data", description: "Add contact info, company size and social profiles to leads", tool: "/api/ai/lead-enrich" },
      { id: "portal-setup", name: "Setup Client Portal", description: "Create a branded white-label portal for client content review", tool: "/api/client-portal" },
      { id: "brand-voice", name: "Configure Brand Voice", description: "Capture the client brand tone, vocabulary and style guidelines", tool: "/api/brand/voice" },
      { id: "onboard-email", name: "Send Welcome Email", description: "Deliver a personalized onboarding email with portal credentials", tool: "/api/email/send-report" },
      { id: "report", name: "Generate Client Report", description: "Create a monthly performance summary for client review", tool: "/api/reports/pdf" },
    ],
  },
};

// ── Mode Definitions ───────────────────────────────────────────────────────

export const MODE_DEFINITIONS: Record<WorkflowMode, { name: string; icon: string; description: string }> = {
  auto: {
    name: "Full Auto",
    icon: "\u26A1",
    description: "AI runs every step automatically. You review the final result.",
  },
  semi: {
    name: "Semi-Auto",
    icon: "\uD83D\uDEE0\uFE0F",
    description: "AI executes each step, then waits for your approval before continuing.",
  },
  guided: {
    name: "Guided",
    icon: "\uD83C\uDFAF",
    description: "AI presents options at each step. You pick the direction, AI executes.",
  },
};

// ── Workflow Functions ─────────────────────────────────────────────────────

export async function createWorkflowSession(
  userId: string,
  projectId: string,
  agentType: AgentType,
  mode: WorkflowMode
): Promise<WorkflowSession> {
  const supabase = createClient();
  const def = AGENT_DEFINITIONS[agentType];

  const steps: WorkflowStep[] = def.steps.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    tool: s.tool,
    status: "pending" as const,
  }));

  const session: Omit<WorkflowSession, "id" | "created_at" | "updated_at"> = {
    user_id: userId,
    project_id: projectId,
    agent_type: agentType,
    mode,
    steps,
    current_step: 0,
    status: "active",
  };

  const { data, error } = await supabase
    .from("workflow_sessions")
    .insert(session)
    .select()
    .single();

  if (error) throw new Error(`Failed to create workflow session: ${error.message}`);
  return data as WorkflowSession;
}

export async function getActiveSession(userId: string): Promise<WorkflowSession | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("workflow_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to get active session: ${error.message}`);
  return data as WorkflowSession | null;
}

export async function runStep(
  sessionId: string,
  stepIndex: number
): Promise<WorkflowStep> {
  const supabase = createClient();

  // Get session
  const { data: session, error: fetchErr } = await supabase
    .from("workflow_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (fetchErr || !session) throw new Error("Session not found");

  const steps = session.steps as WorkflowStep[];
  if (stepIndex < 0 || stepIndex >= steps.length) throw new Error("Invalid step index");

  const step = steps[stepIndex];

  // Mark as active
  steps[stepIndex] = { ...step, status: "active" };
  await supabase
    .from("workflow_sessions")
    .update({ steps, current_step: stepIndex, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  // Execute the tool
  try {
    const res = await fetch(step.tool, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow_session_id: sessionId, step_id: step.id }),
    });

    const result = res.ok ? await res.json() : { error: `Step failed with status ${res.status}` };

    steps[stepIndex] = { ...step, status: "completed", result };

    await supabase
      .from("workflow_sessions")
      .update({ steps, current_step: stepIndex + 1, updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    return steps[stepIndex];
  } catch (err) {
    steps[stepIndex] = {
      ...step,
      status: "completed",
      result: { error: err instanceof Error ? err.message : "Unknown error" },
    };

    await supabase
      .from("workflow_sessions")
      .update({ steps, updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    return steps[stepIndex];
  }
}

export async function approveStep(
  sessionId: string,
  stepIndex: number
): Promise<void> {
  const supabase = createClient();

  const { data: session, error } = await supabase
    .from("workflow_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error || !session) throw new Error("Session not found");

  const steps = session.steps as WorkflowStep[];
  if (stepIndex < 0 || stepIndex >= steps.length) throw new Error("Invalid step index");

  steps[stepIndex] = { ...steps[stepIndex], status: "completed" };

  await supabase
    .from("workflow_sessions")
    .update({
      steps,
      current_step: stepIndex + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

export async function completeSession(
  sessionId: string,
  result?: unknown
): Promise<void> {
  const supabase = createClient();

  await supabase
    .from("workflow_sessions")
    .update({
      status: "completed",
      result: result ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

export async function abandonSession(sessionId: string): Promise<void> {
  const supabase = createClient();

  await supabase
    .from("workflow_sessions")
    .update({
      status: "abandoned",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}
