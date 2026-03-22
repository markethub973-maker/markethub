"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, Download, ChevronDown } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Cum configurez YouTube API?",
  "Cum adaug Spotify?",
  "Instagram nu functioneaza",
  "Unde gasesc Channel ID-ul?",
  "Cum descarc PDF-ul de setup?",
];

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
          style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? "rounded-tr-sm" : "rounded-tl-sm"}`}
        style={isUser
          ? { backgroundColor: "#F59E0B", color: "#1C1814" }
          : { backgroundColor: "#FFFCF7", color: "#292524", border: "1px solid rgba(245,215,160,0.3)" }}>
        {msg.content}
      </div>
    </div>
  );
}

export default function SetupAgent() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Salut! Sunt agentul ViralStat 👋\n\nTe pot ajuta să configurezi orice API sau să înțelegi orice funcție a platformei.\n\nCu ce te pot ajuta?" },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, open, minimized]);

  const send = async (text?: string) => {
    const content = text || input.trim();
    if (!content || streaming) return;
    setInput("");

    const userMsg: Message = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });

      if (!res.ok) throw new Error("Agent error");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullText };
          return updated;
        });
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "A apărut o eroare. Încearcă din nou sau contactează support@markethubpromo.com" };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
          style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", boxShadow: "0 4px 20px rgba(245,158,11,0.4)" }}
          title="Setup Agent ViralStat">
          <Bot className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: "#16a34a" }}>AI</span>
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{ width: 360, height: minimized ? "auto" : 520, backgroundColor: "#1C1814", border: "1px solid rgba(245,215,160,0.15)" }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #D97706, #B45309)", borderBottom: "1px solid rgba(245,215,160,0.1)" }}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Setup Agent ViralStat</p>
              <p className="text-xs text-amber-200">
                {streaming ? "Scrie..." : "Online · Răspunde în română"}
              </p>
            </div>
            <a href="/api/pdf/welcome" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/15 text-white hover:bg-white/25 transition-colors"
              title="Descarca ghidul PDF">
              <Download className="w-3 h-3" />PDF
            </a>
            <button type="button" onClick={() => setMinimized(!minimized)} className="text-white/70 hover:text-white transition-colors">
              <ChevronDown className={`w-4 h-4 transition-transform ${minimized ? "rotate-180" : ""}`} />
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
                {streaming && messages[messages.length - 1]?.content === "" && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="px-3.5 py-2.5 rounded-xl rounded-tl-sm flex gap-1.5 items-center"
                      style={{ backgroundColor: "#FFFCF7" }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{ backgroundColor: "#C4AA8A", animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Suggestions (only at start) */}
              {messages.length <= 1 && (
                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map(s => (
                    <button key={s} type="button" onClick={() => send(s)}
                      className="text-xs px-3 py-1.5 rounded-full transition-colors"
                      style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#C4AA8A", border: "1px solid rgba(245,215,160,0.2)" }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(245,158,11,0.15)"; e.currentTarget.style.color = "#F59E0B"; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.1)"; e.currentTarget.style.color = "#C4AA8A"; }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="p-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(245,215,160,0.1)" }}>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                    placeholder="Scrie o întrebare..."
                    disabled={streaming}
                    className="flex-1 px-3 py-2 text-sm rounded-xl focus:outline-none"
                    style={{ backgroundColor: "rgba(245,215,160,0.08)", color: "#FFF8F0", border: "1px solid rgba(245,215,160,0.15)", "::placeholder": { color: "#78614E" } } as any}
                  />
                  <button type="button" onClick={() => send()} disabled={!input.trim() || streaming}
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                    style={input.trim() && !streaming
                      ? { background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "white" }
                      : { backgroundColor: "rgba(245,215,160,0.1)", color: "#78614E" }}>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
