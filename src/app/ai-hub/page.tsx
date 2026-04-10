"use client";

import Header from "@/components/layout/Header";
import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import * as XLSX from "xlsx";
import {
  HelpCircle, Search, Mail, Calculator, Lightbulb, Wand2, Palette, Target,
  Send, Bot, ArrowLeft, Sparkles, FileDown, Table2, GitBranch, X, Loader2,
  Tags, Megaphone, PenTool, Layout, Globe, BookOpen, Share2, BarChart2,
} from "lucide-react";
import { AGENTS, AgentType } from "@/lib/agents";

const WorkflowDiagram = dynamic(
  () => import("@/components/ui/WorkflowDiagram"),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-xl bg-[#F5D7A0]/20" /> }
);

const ICON_MAP: Record<string, React.ElementType> = {
  HelpCircle, Search, Mail, Calculator, Lightbulb, Wand2, Palette, Target,
  Tags, Megaphone, PenTool, Layout, Globe, BookOpen, Share2, BarChart2,
};

type Message = { role: "user" | "assistant"; content: string };

const WELCOME_MESSAGES: Record<AgentType, string> = {
  support: "Hi! I'm the MarketHub Pro support agent. I can help you with platform setup, API configuration, or any questions about features. How can I help you?",
  research: "Hi! I'm the Deep Research agent. I can help you with market research, competitor analysis, industry trends, and identifying target audiences.\n\nTell me: what would you like to research?",
  "email-marketing": "Hi! I'm the Email Marketing agent. I can generate newsletters, cold outreach emails, drip campaigns, and curated digests.\n\nWhat type of email would you like to create?",
  financial: "Hi! I'm the MarketHub Pro financial analyst. I can help you with campaign ROI, marketing budgets, financial models, and sensitivity analysis.\n\nWhat calculations can I help you with?",
  brainstorming: "Hi! I'm the creative brainstorming agent. I can help you generate campaign ideas, plan content, and develop marketing strategies.\n\nWhat brand or product are we brainstorming for?",
  "prompt-factory": "Hi! I'm Prompt Factory. I generate professional prompts for Midjourney, DALL-E, Stable Diffusion, ChatGPT, and Gemini — optimized for content marketing.\n\nWhat type of prompt do you need?",
  brand: "Hi! I'm the Brand Guidelines agent. I can help you create or apply a brand's visual identity: colors, fonts, communication tone, logo rules.\n\nWhat brand are we working on?",
  "competitive-ads": "Hi! I'm the ad analysis agent. I can analyze competitor ads, identify effective patterns, and recommend advertising strategies.\n\nWhich competitors would you like to analyze?",
  "pricing-strategist": "Hi! I'm the Pricing Strategist. I help you design tiered pricing structures, analyze price elasticity, and maximize revenue across customer segments.\n\nTell me about your product and who you're selling to.",
  "ad-copy-creator": "Hi! I'm the Ad Copy Creator. I write high-converting ad copy for Google, Facebook, Instagram, LinkedIn, and TikTok — with multiple A/B variations.\n\nWhich platform and what's the campaign objective?",
  "copywriter": "Hi! I'm your Copywriter. I craft compelling headlines, value propositions, product descriptions, and CTAs that convert visitors into customers.\n\nWhat do you need copy for?",
  "landing-page-writer": "Hi! I'm the Landing Page Writer. I create high-converting landing page copy — from hero headline to social proof to final CTA.\n\nTell me about your product and target customer.",
  "seo-optimizer": "Hi! I'm the SEO Optimizer. I help you rank higher — keyword research, meta tag optimization, content structure, and technical SEO recommendations.\n\nWhat page or topic do you want to optimize?",
  "blog-writer": "Hi! I'm the Blog Writer. I create educational, SEO-optimized blog posts, tutorials, and thought leadership articles that build authority and drive traffic.\n\nWhat topic would you like to write about?",
  "social-media-creator": "Hi! I'm the Social Media Creator. I create platform-specific content, captions, content calendars, and posting strategies for Instagram, LinkedIn, TikTok, and more.\n\nWhich platform and what's your goal?",
  "market-researcher": "Hi! I'm the Market Researcher. I analyze target markets, validate product-market fit, and uncover customer segments and opportunities.\n\nWhat market or product do you want to research?",
};

function AgentCard({ id, onClick }: { id: AgentType; onClick: () => void }) {
  const agent = AGENTS[id];
  const Icon = ICON_MAP[agent.icon] || Sparkles;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-xl p-5 transition-all hover:scale-[1.02]"
      style={{
        backgroundColor: "#FFFCF7",
        border: "1px solid rgba(245,215,160,0.25)",
        boxShadow: "0 1px 3px rgba(120,97,78,0.08)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = agent.color;
        e.currentTarget.style.boxShadow = `0 4px 20px ${agent.color}20`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(245,215,160,0.25)";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(120,97,78,0.08)";
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${agent.color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color: agent.color }} />
        </div>
        <h3 className="font-semibold text-sm" style={{ color: "#292524" }}>
          {agent.name}
        </h3>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "#A8967E" }}>
        {agent.description}
      </p>
    </button>
  );
}

function ChatBubble({ msg, color }: { msg: Message; color: string }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
          style={{ backgroundColor: `${color}20` }}
        >
          <Bot className="w-4 h-4" style={{ color }} />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? "rounded-tr-sm" : "rounded-tl-sm"
        }`}
        style={
          isUser
            ? { backgroundColor: "#F59E0B", color: "#1C1814" }
            : { backgroundColor: "#FFFCF7", color: "#292524", border: "1px solid rgba(245,215,160,0.3)" }
        }
      >
        {msg.content}
      </div>
    </div>
  );
}

export default function AIHubPage() {
  const [activeAgent, setActiveAgent] = useState<AgentType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (activeAgent) inputRef.current?.focus();
  }, [messages, activeAgent]);

  const openAgent = (id: AgentType) => {
    setActiveAgent(id);
    setMessages([{ role: "assistant", content: WELCOME_MESSAGES[id] }]);
    setInput("");
    setShowDiagram(false);
  };

  const backToHub = () => {
    setActiveAgent(null);
    setMessages([]);
    setInput("");
    setShowDiagram(false);
  };

  const send = async (text?: string) => {
    const content = text || input.trim();
    if (!content || streaming) return;
    setInput("");

    const userMsg: Message = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setStreaming(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: activeAgent,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "api_error");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullText };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "An error occurred. Please check that ANTHROPIC_API_KEY is configured on the server or contact support@markethubpromo.com",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  // Download Excel
  const downloadExcel = () => {
    if (!agentConfig || messages.length === 0) return;
    const wsData = messages
      .filter((m) => m.content)
      .map((m, i) => ({
        "#": i + 1,
        Role: m.role === "user" ? "You" : agentConfig.name,
        Message: m.content,
        Type: m.role === "user" ? "Question" : "Strategy / Answer",
      }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    ws["!cols"] = [{ wch: 5 }, { wch: 22 }, { wch: 90 }, { wch: 18 }];

    // Style header row
    const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "F59E0B" } } };
    ["A1", "B1", "C1", "D1"].forEach((cell) => {
      if (ws[cell]) ws[cell].s = headerStyle;
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Strategy");
    XLSX.writeFile(
      wb,
      `${agentConfig.name.replace(/\s+/g, "-")}-strategy-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Download PDF
  const downloadPDF = async () => {
    if (!agentConfig || messages.length === 0) return;
    setPdfLoading(true);
    try {
      const { pdf, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");

      const styles = StyleSheet.create({
        page: {
          padding: 44,
          backgroundColor: "#FFFFFF",
          fontFamily: "Helvetica",
        },
        header: {
          marginBottom: 22,
          paddingBottom: 18,
          borderBottomWidth: 2,
          borderBottomColor: "#F5D7A0",
          borderBottomStyle: "solid",
        },
        brandBadge: {
          fontSize: 8,
          color: "#F59E0B",
          fontWeight: "bold",
          letterSpacing: 2,
          marginBottom: 8,
        },
        title: {
          fontSize: 22,
          fontWeight: "bold",
          color: "#1C1814",
          marginBottom: 4,
        },
        subtitle: {
          fontSize: 10,
          color: "#A8967E",
        },
        messageWrap: {
          marginBottom: 14,
        },
        roleLabel: {
          fontSize: 8,
          color: "#A8967E",
          marginBottom: 5,
          textTransform: "uppercase",
          letterSpacing: 1,
          fontWeight: "bold",
        },
        userBubble: {
          backgroundColor: "#FFF8ED",
          padding: 12,
          borderRadius: 8,
          borderLeftWidth: 3,
          borderLeftColor: "#F59E0B",
          borderLeftStyle: "solid",
        },
        assistantBubble: {
          backgroundColor: "#F9F9F7",
          padding: 14,
          borderRadius: 8,
          borderLeftWidth: 3,
          borderLeftColor: "#D1C4B0",
          borderLeftStyle: "solid",
        },
        messageText: {
          fontSize: 10,
          color: "#292524",
          lineHeight: 1.65,
        },
        footer: {
          position: "absolute",
          bottom: 28,
          left: 44,
          right: 44,
          borderTopWidth: 1,
          borderTopColor: "#F5D7A0",
          borderTopStyle: "solid",
          paddingTop: 8,
          flexDirection: "row",
          justifyContent: "space-between",
        },
        footerText: {
          fontSize: 8,
          color: "#C4AA8A",
        },
      });

      const date = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const filteredMessages = messages.filter((m) => m.content.trim());

      // Create element via React.createElement to avoid JSX in async context issues
      const React = await import("react");
      const DocElement = React.createElement(
        Document,
        null,
        React.createElement(
          Page,
          { size: "A4", style: styles.page },
          // Header
          React.createElement(
            View,
            { style: styles.header },
            React.createElement(Text, { style: styles.brandBadge }, "MARKETHUB PRO — AI STRATEGY DOCUMENT"),
            React.createElement(Text, { style: styles.title }, agentConfig.name),
            React.createElement(
              Text,
              { style: styles.subtitle },
              `Generated on ${date}  ·  ${filteredMessages.length} messages  ·  markethubpromo.com`
            )
          ),
          // Messages
          ...filteredMessages.map((msg, i) =>
            React.createElement(
              View,
              { key: i, style: styles.messageWrap },
              React.createElement(
                Text,
                { style: styles.roleLabel },
                msg.role === "user" ? "YOU" : agentConfig.name.toUpperCase()
              ),
              React.createElement(
                View,
                { style: msg.role === "user" ? styles.userBubble : styles.assistantBubble },
                React.createElement(Text, { style: styles.messageText }, msg.content)
              )
            )
          ),
          // Footer
          React.createElement(
            View,
            { style: styles.footer },
            React.createElement(Text, { style: styles.footerText }, "MarketHub Pro · markethubpromo.com"),
            React.createElement(Text, { style: styles.footerText }, date)
          )
        )
      );

      const blob = await pdf(DocElement).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${agentConfig.name.replace(/\s+/g, "-")}-strategy-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[PDF] Generation failed:", err);
      alert("PDF generation failed. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const agentConfig = activeAgent ? AGENTS[activeAgent] : null;
  const AgentIcon = agentConfig ? ICON_MAP[agentConfig.icon] || Sparkles : Sparkles;
  const hasContent = messages.filter((m) => m.content.trim()).length > 1;
  const lastAssistantMessage =
    [...messages].reverse().find((m) => m.role === "assistant" && m.content.trim())?.content || "";

  // Agent selection grid
  if (!activeAgent) {
    return (
      <div>
        <Header title="AI Hub" subtitle="8 specialized AI agents for marketing agencies" />
        <div className="p-6 space-y-6">
          {/* Hero */}
          <div
            className="rounded-xl p-6"
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.04))",
              border: "1px solid rgba(245,215,160,0.25)",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-5 h-5" style={{ color: "#F59E0B" }} />
              <h2 className="font-bold text-lg" style={{ color: "#292524" }}>
                Your AI Agents
              </h2>
            </div>
            <p className="text-sm" style={{ color: "#A8967E" }}>
              Choose a specialized agent to get started. Each agent has unique expertise and
              access to MarketHub Pro platform data. Export strategies as{" "}
              <span style={{ color: "#D97706", fontWeight: 600 }}>PDF</span>,{" "}
              <span style={{ color: "#D97706", fontWeight: 600 }}>Excel</span>, or visualize as{" "}
              <span style={{ color: "#D97706", fontWeight: 600 }}>workflow diagrams</span>.
            </p>
          </div>

          {/* Agent Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(AGENTS) as AgentType[]).map((id) => (
              <AgentCard key={id} id={id} onClick={() => openAgent(id)} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Chat view
  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      {/* Chat Header */}
      <div
        className="flex items-center gap-3 px-6 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(245,215,160,0.15)" }}
      >
        <button
          type="button"
          onClick={backToHub}
          aria-label="Back to AI Hub"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ backgroundColor: "rgba(245,215,160,0.1)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,158,11,0.15)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.1)")}
        >
          <ArrowLeft className="w-4 h-4" style={{ color: "#A8967E" }} />
        </button>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${agentConfig!.color}15` }}
        >
          <AgentIcon className="w-5 h-5" style={{ color: agentConfig!.color }} />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-sm" style={{ color: "#292524" }}>
            {agentConfig!.name}
          </h2>
          <p className="text-xs" style={{ color: "#A8967E" }}>
            {streaming ? "Typing..." : agentConfig!.description}
          </p>
        </div>

        {/* Export & Diagram Buttons — visible once there's real content */}
        {hasContent && (
          <div className="flex items-center gap-1.5">
            {/* PDF */}
            <button
              type="button"
              onClick={downloadPDF}
              disabled={pdfLoading}
              title="Download as PDF"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "#FFF0D6", color: "#D97706", border: "1px solid #F5D7A0" }}
            >
              {pdfLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Excel */}
            <button
              type="button"
              onClick={downloadExcel}
              title="Download as Excel"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "#F0FFF4", color: "#16A34A", border: "1px solid #BBF7D0" }}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            {/* Workflow Diagram */}
            <button
              type="button"
              onClick={() => setShowDiagram(true)}
              title="View workflow diagram"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "#F5F0FF", color: "#7C3AED", border: "1px solid #DDD6FE" }}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Diagram</span>
            </button>
          </div>
        )}

        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ backgroundColor: `${agentConfig!.color}15`, color: agentConfig!.color }}
        >
          AI Agent
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, i) => (
          <ChatBubble key={i} msg={msg} color={agentConfig!.color} />
        ))}
        {streaming && messages[messages.length - 1]?.content === "" && (
          <div className="flex gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: `${agentConfig!.color}20` }}
            >
              <Bot className="w-4 h-4" style={{ color: agentConfig!.color }} />
            </div>
            <div
              className="px-4 py-3 rounded-xl rounded-tl-sm flex gap-1.5 items-center"
              style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.3)" }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: agentConfig!.color, animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(245,215,160,0.15)" }}>
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={`Ask the ${agentConfig!.name} agent...`}
            disabled={streaming}
            className="flex-1 px-4 py-3 text-sm rounded-xl focus:outline-none transition-colors"
            style={{
              backgroundColor: "#FFFCF7",
              color: "#292524",
              border: "1px solid rgba(245,215,160,0.25)",
            }}
          />
          <button
            type="button"
            onClick={() => send()}
            aria-label="Send message"
            disabled={!input.trim() || streaming}
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
            style={
              input.trim() && !streaming
                ? { backgroundColor: agentConfig!.color, color: "white" }
                : { backgroundColor: "rgba(245,215,160,0.1)", color: "#C4AA8A" }
            }
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Workflow Diagram Modal */}
      {showDiagram && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDiagram(false);
          }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl flex flex-col"
            style={{
              backgroundColor: "#FFFCF7",
              border: "1px solid rgba(245,215,160,0.4)",
              boxShadow: "0 24px 64px rgba(120,97,78,0.2)",
              maxHeight: "90vh",
            }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "#F5F0FF" }}
                >
                  <GitBranch className="w-4 h-4" style={{ color: "#7C3AED" }} />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-[#292524]">Strategy Workflow</h2>
                  <p className="text-xs text-[#A8967E]">
                    Based on the last AI response · {agentConfig!.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDiagram(false)}
                aria-label="Close diagram"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ backgroundColor: "rgba(245,215,160,0.1)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,158,11,0.15)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.1)")}
              >
                <X className="w-4 h-4 text-[#A8967E]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6">
              <WorkflowDiagram
                text={lastAssistantMessage}
                agentName={agentConfig!.name}
              />
            </div>

            {/* Modal Footer hint */}
            <div
              className="px-6 py-3 flex-shrink-0 text-center"
              style={{ borderTop: "1px solid rgba(245,215,160,0.15)" }}
            >
              <p className="text-xs text-[#C4AA8A]">
                Tip: Ask the agent for a &quot;step-by-step plan&quot; or &quot;numbered action list&quot; for better diagrams
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
