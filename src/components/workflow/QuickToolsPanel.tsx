"use client";

import { useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
  Play,
  Sparkles,
  BarChart3,
  FileDown,
  CalendarDays,
  Users,
  Shield,
  Type,
  Hash,
  Lightbulb,
  Image,
  Video,
  Music,
  FileText,
  RefreshCw,
  ArrowRightLeft,
  TrendingUp,
  Clock,
  FileSpreadsheet,
  Mail,
  Palette,
  UserSearch,
  UserCheck,
  Eye,
  ShieldCheck,
  Smile,
  Mic,
  Clapperboard,
  SearchCheck,
  Brain,
} from "lucide-react";

// ── Tool Definitions ───────────────────────────────────────────────────────

interface QuickTool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  api: string;
  placeholder: string;
}

interface ToolCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  tools: QuickTool[];
}

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: "ai-generate",
    name: "AI Generate",
    icon: <Sparkles size={14} />,
    color: "#F59E0B",
    tools: [
      { id: "caption", name: "Caption Writer", description: "Generate platform-optimized captions with hooks and CTAs", icon: <Type size={14} />, api: "/api/captions", placeholder: "Topic or post idea..." },
      { id: "ab-titles", name: "A/B Titles", description: "Generate multiple title variants for split testing", icon: <ArrowRightLeft size={14} />, api: "/api/ai/ab-titles", placeholder: "Main title to generate variants for..." },
      { id: "hooks", name: "Hook Generator", description: "Create scroll-stopping opening lines and attention grabbers", icon: <Lightbulb size={14} />, api: "/api/ai/hooks", placeholder: "Topic or niche..." },
      { id: "hashtags", name: "Hashtag Suggester", description: "Find the best hashtag mix for maximum reach and engagement", icon: <Hash size={14} />, api: "/api/ai/hashtags", placeholder: "Post topic or caption..." },
      { id: "thumbnail", name: "Thumbnail Ideas", description: "Get AI-suggested thumbnail concepts for YouTube and social", icon: <Image size={14} />, api: "/api/ai/thumbnail", placeholder: "Video title or topic..." },
      { id: "image", name: "AI Image", description: "Generate custom images and graphics with text-to-image AI", icon: <Image size={14} />, api: "/api/studio/image", placeholder: "Describe the image you want..." },
      { id: "video", name: "AI Video", description: "Create short-form video content from text prompts", icon: <Video size={14} />, api: "/api/studio/video", placeholder: "Describe the video scene..." },
      { id: "audio", name: "AI Audio", description: "Generate voiceovers, music and sound effects", icon: <Music size={14} />, api: "/api/studio/audio", placeholder: "Describe the audio..." },
      { id: "reels-script", name: "Reels Script", description: "Write complete scripts for Instagram Reels and TikTok", icon: <Clapperboard size={14} />, api: "/api/studio/reels-script", placeholder: "Reels topic or concept..." },
      { id: "content-gap", name: "Content Gap", description: "Find content opportunities your competitors are missing", icon: <SearchCheck size={14} />, api: "/api/ai/content-gap", placeholder: "Your niche or competitor URL..." },
      { id: "recycler", name: "Content Recycler", description: "Transform old top-performing content into fresh new posts", icon: <RefreshCw size={14} />, api: "/api/ai/recycler", placeholder: "Paste old post to recycle..." },
      { id: "repurpose", name: "Repurpose Content", description: "Adapt content from one platform format to another", icon: <ArrowRightLeft size={14} />, api: "/api/ai/repurpose", placeholder: "Paste content to repurpose..." },
    ],
  },
  {
    id: "analytics",
    name: "Analytics",
    icon: <BarChart3 size={14} />,
    color: "#3B82F6",
    tools: [
      { id: "sentiment", name: "Sentiment Analysis", description: "Analyze audience sentiment from comments and mentions", icon: <Smile size={14} />, api: "/api/ai/sentiment", placeholder: "Text or URL to analyze..." },
      { id: "engagement-predict", name: "Engagement Predictor", description: "Predict engagement score (0-100) for a post before publishing", icon: <TrendingUp size={14} />, api: "/api/ai/engagement-predict", placeholder: "Paste caption or post content..." },
      { id: "best-time", name: "Best Time to Post", description: "Calculate optimal posting times per platform and audience", icon: <Clock size={14} />, api: "/api/analytics/best-time", placeholder: "Platform and audience type..." },
    ],
  },
  {
    id: "export",
    name: "Export",
    icon: <FileDown size={14} />,
    color: "#10B981",
    tools: [
      { id: "pdf-report", name: "PDF Report", description: "Generate a branded performance PDF with charts and insights", icon: <FileText size={14} />, api: "/api/pdf/marketing-report", placeholder: "Report title or date range..." },
      { id: "excel-export", name: "Excel Export", description: "Export analytics data to a structured Excel spreadsheet", icon: <FileSpreadsheet size={14} />, api: "/api/reports/send", placeholder: "Data type to export..." },
      { id: "email-report", name: "Email Report", description: "Send a performance summary directly to a client email", icon: <Mail size={14} />, api: "/api/email/send-report", placeholder: "Client email address..." },
    ],
  },
  {
    id: "planning",
    name: "Planning",
    icon: <CalendarDays size={14} />,
    color: "#8B5CF6",
    tools: [
      { id: "campaign-strategy", name: "Campaign Strategy", description: "Generate a full campaign plan with themes, timeline and KPIs", icon: <Brain size={14} />, api: "/api/ai/content-gap", placeholder: "Campaign goal or brief..." },
      { id: "content-calendar", name: "Content Calendar", description: "Auto-fill a week or month of content slots with AI ideas", icon: <CalendarDays size={14} />, api: "/api/calendar", placeholder: "Number of days and niche..." },
      { id: "brand-voice", name: "Brand Voice", description: "Define and save brand tone, vocabulary and style guidelines", icon: <Palette size={14} />, api: "/api/brand/voice", placeholder: "Describe your brand personality..." },
    ],
  },
  {
    id: "leads",
    name: "Leads",
    icon: <Users size={14} />,
    color: "#EC4899",
    tools: [
      { id: "lead-finder", name: "Lead Finder", description: "Search for potential client leads matching your ideal profile", icon: <UserSearch size={14} />, api: "/api/brain/mine-leads", placeholder: "Industry and location..." },
      { id: "lead-enrich", name: "Lead Enrichment", description: "Add contact info, company details and social profiles to leads", icon: <UserCheck size={14} />, api: "/api/studio/lead-enrich", placeholder: "Company name or domain..." },
      { id: "competitor-scan", name: "Competitor Scan", description: "Deep-analyze a competitor social strategy and content mix", icon: <Eye size={14} />, api: "/api/ai/content-gap", placeholder: "Competitor name or URL..." },
    ],
  },
  {
    id: "security",
    name: "Security",
    icon: <Shield size={14} />,
    color: "#EF4444",
    tools: [
      { id: "abuse-scan", name: "Abuse Scan", description: "Check your accounts for suspicious activity and unauthorized access", icon: <ShieldCheck size={14} />, api: "/api/cron/abuse-scan", placeholder: "Account or platform to scan..." },
      { id: "security-check", name: "Security Audit", description: "Run a full security check on connected integrations and tokens", icon: <Shield size={14} />, api: "/api/security/health-check", placeholder: "Run full audit..." },
    ],
  },
];

// ── Quick Tool Inline Runner ───────────────────────────────────────────────

function ToolRunner({ tool, onClose }: { tool: QuickTool; onClose: () => void }) {
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!input.trim() || running) return;
    setRunning(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(tool.api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim(), quick_tool: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed with status ${res.status}`);
      } else {
        setResult(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      className="mt-2 p-3 rounded-lg"
      style={{ backgroundColor: "rgba(245,215,160,0.08)", border: "1px solid rgba(245,215,160,0.2)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRun()}
          placeholder={tool.placeholder}
          className="flex-1 px-3 py-2 rounded-lg text-xs focus:outline-none"
          style={{
            backgroundColor: "white",
            border: "1px solid rgba(245,215,160,0.3)",
            color: "var(--color-text)",
          }}
          autoFocus
        />
        <button
          onClick={handleRun}
          disabled={!input.trim() || running}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
          style={{
            backgroundColor: input.trim() && !running ? "#F59E0B" : "#C4AA8A",
            color: "#1C1814",
            cursor: input.trim() && !running ? "pointer" : "not-allowed",
          }}
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          Run
        </button>
        <button
          onClick={onClose}
          className="px-2 py-2 rounded-lg text-xs"
          style={{ color: "#78614E" }}
        >
          &times;
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#B91C1C" }}>
          {error}
        </div>
      )}

      {result && (
        <pre
          className="px-3 py-2 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap"
          style={{ backgroundColor: "white", border: "1px solid rgba(245,215,160,0.2)", color: "var(--color-text)", maxHeight: 200 }}
        >
          {result}
        </pre>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function QuickToolsPanel() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["ai-generate"]));
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredCategories = TOOL_CATEGORIES.map((cat) => ({
    ...cat,
    tools: cat.tools.filter(
      (t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.tools.length > 0);

  const totalTools = TOOL_CATEGORIES.reduce((sum, c) => sum + c.tools.length, 0);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 md:px-6" style={{ borderBottom: "1px solid rgba(245,215,160,0.25)" }}>
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
            Quick Tools
          </h3>
          <p className="text-xs" style={{ color: "#A8967E" }}>
            {totalTools} tools in {TOOL_CATEGORIES.length} categories
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 md:px-6" style={{ borderBottom: "1px solid rgba(245,215,160,0.15)" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#C4AA8A" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-xs focus:outline-none"
            style={{
              backgroundColor: "#F5EFE6",
              border: "1px solid rgba(245,215,160,0.3)",
              color: "var(--color-text)",
            }}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="max-h-96 md:max-h-[500px] overflow-y-auto">
        {filteredCategories.map((cat) => {
          const isOpen = expanded.has(cat.id) || search.length > 0;

          return (
            <div key={cat.id}>
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center gap-2 px-4 py-2.5 md:px-6 text-left transition-colors"
                style={{ borderBottom: "1px solid rgba(245,215,160,0.1)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <span style={{ color: cat.color }}>{cat.icon}</span>
                <span className="flex-1 text-xs font-bold" style={{ color: "var(--color-text)" }}>
                  {cat.name}
                </span>
                <span className="text-xs" style={{ color: "#A8967E" }}>{cat.tools.length}</span>
                {isOpen ? (
                  <ChevronDown size={14} style={{ color: "#A8967E" }} />
                ) : (
                  <ChevronRight size={14} style={{ color: "#A8967E" }} />
                )}
              </button>

              {/* Tools */}
              {isOpen && (
                <div className="px-4 md:px-6 pb-1">
                  {cat.tools.map((tool) => (
                    <div key={tool.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveTool(activeTool === tool.id ? null : tool.id)
                        }
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
                        style={{
                          backgroundColor:
                            activeTool === tool.id
                              ? "rgba(245,158,11,0.06)"
                              : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (activeTool !== tool.id)
                            e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.08)";
                        }}
                        onMouseLeave={(e) => {
                          if (activeTool !== tool.id)
                            e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <span style={{ color: cat.color }}>{tool.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                            {tool.name}
                          </div>
                          <div className="text-xs truncate" style={{ color: "#A8967E", fontSize: 10 }}>
                            {tool.description}
                          </div>
                        </div>
                        <Play size={12} style={{ color: "#C4AA8A", flexShrink: 0 }} />
                      </button>

                      {activeTool === tool.id && (
                        <ToolRunner
                          tool={tool}
                          onClose={() => setActiveTool(null)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="px-6 py-8 text-center">
            <p className="text-xs" style={{ color: "#A8967E" }}>
              No tools matching &ldquo;{search}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
