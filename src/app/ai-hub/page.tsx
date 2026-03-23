"use client";

import Header from "@/components/layout/Header";
import { useState, useRef, useEffect } from "react";
import {
  HelpCircle, Search, Mail, Calculator, Lightbulb, Wand2, Palette, Target,
  Send, Bot, ArrowLeft, Sparkles,
} from "lucide-react";
import { AGENTS, AgentType } from "@/lib/agents";

const ICON_MAP: Record<string, React.ElementType> = {
  HelpCircle, Search, Mail, Calculator, Lightbulb, Wand2, Palette, Target,
};

type Message = { role: "user" | "assistant"; content: string };

const WELCOME_MESSAGES: Record<AgentType, string> = {
  support: "Salut! Sunt agentul de suport MarketHub Pro. Te pot ajuta cu setup-ul platformei, configurarea API-urilor sau orice intrebare despre functionalitati. Cu ce te pot ajuta?",
  research: "Salut! Sunt agentul de Deep Research. Te pot ajuta cu cercetare de piata, analiza competitorilor, trenduri de industrie si identificarea audientelor target.\n\nSpune-mi: ce vrei sa cercetam?",
  "email-marketing": "Salut! Sunt agentul de Email Marketing. Pot genera newsletter-uri, email-uri cold outreach, campanii drip si digest-uri curatoriate.\n\nCe tip de email vrei sa cream?",
  financial: "Salut! Sunt analistul financiar MarketHub Pro. Te pot ajuta cu ROI campanii, bugete marketing, modele financiare si sensitivity analysis.\n\nCu ce calcule te pot ajuta?",
  brainstorming: "Salut! Sunt agentul de brainstorming creativ. Te pot ajuta sa generezi idei de campanii, sa planifici continut si sa dezvolti strategii de marketing.\n\nPentru ce brand sau produs facem brainstorming?",
  "prompt-factory": "Salut! Sunt Prompt Factory. Generez prompturi profesionale pentru Midjourney, DALL-E, Stable Diffusion, ChatGPT si Gemini — optimizate pentru content marketing.\n\nCe tip de prompt ai nevoie?",
  brand: "Salut! Sunt agentul de Brand Guidelines. Te pot ajuta sa creezi sau sa aplici identitatea vizuala a unui brand: culori, fonturi, ton comunicare, reguli logo.\n\nPentru ce brand lucram?",
  "competitive-ads": "Salut! Sunt agentul de analiza reclame. Pot analiza reclamele competitorilor, identifica pattern-uri eficiente si recomanda strategii publicitare.\n\nCe competitori vrei sa analizam?",
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
  };

  const backToHub = () => {
    setActiveAgent(null);
    setMessages([]);
    setInput("");
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
          content: "A aparut o eroare. Verifica ca ANTHROPIC_API_KEY este configurat pe server sau contacteaza support@markethubpromo.com",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  const agentConfig = activeAgent ? AGENTS[activeAgent] : null;
  const AgentIcon = agentConfig ? ICON_MAP[agentConfig.icon] || Sparkles : Sparkles;

  // Agent selection grid
  if (!activeAgent) {
    return (
      <div>
        <Header title="AI Hub" subtitle="8 agenti AI specializati pentru agentii de marketing" />
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
                Agentii tai AI
              </h2>
            </div>
            <p className="text-sm" style={{ color: "#A8967E" }}>
              Alege un agent specializat pentru a incepe. Fiecare agent are expertiza unica si
              acces la datele platformei MarketHub Pro.
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
            {streaming ? "Scrie..." : agentConfig!.description}
          </p>
        </div>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
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
            placeholder={`Intreaba agentul ${agentConfig!.name}...`}
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
    </div>
  );
}
