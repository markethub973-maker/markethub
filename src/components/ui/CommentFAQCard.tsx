"use client";
import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

interface FAQItem { q: string; a: string; why_it_matters: string }
interface ContentIdea { title: string; type: "video" | "short" | "series"; reasoning: string }
interface TopQuestion { question: string; frequency: number; answer_opportunity: string }

interface FAQResult {
  top_questions: TopQuestion[];
  faq: FAQItem[];
  content_ideas: ContentIdea[];
  audience_pain_points: string[];
  praise_themes: string[];
  criticism_themes: string[];
  cta_suggestions: string[];
  pinned_comment_suggestion: string;
  reply_template: string;
}

interface Props {
  youtubeVideoId?: string;
  videoTitle?: string;
  channelNiche?: string;
}

const TYPE_COLOR: Record<string, string> = {
  video: "bg-red-50 text-red-600 border-red-200",
  short: "bg-purple-50 text-purple-600 border-purple-200",
  series: "bg-blue-50 text-blue-600 border-blue-200",
};

export default function CommentFAQCard({ youtubeVideoId, videoTitle, channelNiche }: Props) {
  const [result, setResult] = useState<FAQResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<"faq" | "ideas" | "cta">("faq");
  const [copied, setCopied] = useState<string | null>(null);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let comments: string[] = [];

      if (youtubeVideoId) {
        const commentsRes = await fetch(`/api/youtube/comments?videoId=${youtubeVideoId}&max=100`);
        const commentsData = await commentsRes.json();
        comments = commentsData.comments || [];
        if (comments.length === 0) {
          setError(commentsData.error || "No comments found for this video");
          return;
        }
      } else {
        setError("Video ID required");
        return;
      }

      const res = await fetch("/api/ai/comment-faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments, channelNiche: channelNiche || "general", videoTitle }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Analysis failed");
        return;
      }
      setResult(data);
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#E8D9C5] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#F59E0B]" />
          <h3 className="font-semibold text-sm text-[#292524]">Comment FAQ Extractor</h3>
        </div>
        {!result && (
          <button
            onClick={analyze}
            disabled={loading}
            className="btn-3d-active flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Analyzing...</>
            ) : "Extract FAQ"}
          </button>
        )}
        {result && (
          <button onClick={() => setResult(null)} className="text-xs text-[#A8967E] hover:text-[#292524]">Reset</button>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</div>
      )}

      {result && (
        <>
          {/* Section tabs */}
          <div className="flex gap-1 border-b border-[#E8D9C5] pb-0">
            {(["faq", "ideas", "cta"] as const).map(s => (
              <button key={s} onClick={() => setSection(s)}
                className={`px-4 py-2 text-sm font-semibold rounded-t transition-colors capitalize ${section === s ? "btn-3d-active" : "btn-3d"}`}>
                {s === "faq" ? "FAQ" : s === "ideas" ? "Content Ideas" : "CTAs"}
              </button>
            ))}
          </div>

          {/* FAQ tab */}
          {section === "faq" && (
            <div className="space-y-2">
              {result.top_questions?.slice(0, 3).map((q, i) => (
                <div key={i} className="bg-[#FFFCF7] border border-[#F5D7A0]/40 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[#F59E0B] text-xs font-bold">#{i + 1}</span>
                    <p className="text-xs font-semibold text-[#292524]">{q.question}</p>
                    <span className="ml-auto text-xs text-[#C4AA8A]">{q.frequency}x asked</span>
                  </div>
                  <p className="text-xs text-[#78614E] pl-5">{q.answer_opportunity}</p>
                </div>
              ))}

              {result.faq?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-[#292524] mb-1.5">Full FAQ</p>
                  {result.faq.map((item, i) => (
                    <FAQAccordion key={i} item={item} />
                  ))}
                </div>
              )}

              {/* Pinned comment */}
              {result.pinned_comment_suggestion && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-[#292524]">📌 Pinned Comment Suggestion</p>
                    <button onClick={() => copyText(result.pinned_comment_suggestion, "pinned")}
                      className="text-xs flex items-center gap-1 text-[#A8967E] hover:text-[#292524]">
                      {copied === "pinned" ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      {copied === "pinned" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs text-[#78614E] leading-relaxed">{result.pinned_comment_suggestion}</p>
                </div>
              )}

              {/* Reply template */}
              {result.reply_template && (
                <div className="bg-[#F8F5F0] border border-[#E8D9C5] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-[#292524]">💬 Reply Template</p>
                    <button onClick={() => copyText(result.reply_template, "reply")}
                      className="text-xs flex items-center gap-1 text-[#A8967E] hover:text-[#292524]">
                      {copied === "reply" ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      {copied === "reply" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs text-[#78614E] leading-relaxed">{result.reply_template}</p>
                </div>
              )}
            </div>
          )}

          {/* Content Ideas tab */}
          {section === "ideas" && (
            <div className="space-y-2">
              {result.content_ideas?.map((idea, i) => (
                <div key={i} className="bg-[#FFFCF7] border border-[#F5D7A0]/40 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded border capitalize ${TYPE_COLOR[idea.type] || "bg-gray-100 text-gray-600"}`}>
                      {idea.type}
                    </span>
                    <p className="text-xs font-semibold text-[#292524]">{idea.title}</p>
                  </div>
                  <p className="text-xs text-[#78614E]">{idea.reasoning}</p>
                </div>
              ))}

              <div className="grid grid-cols-1 gap-2 mt-2">
                {result.audience_pain_points?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#292524] mb-1">Pain Points</p>
                    <ul className="space-y-0.5">
                      {result.audience_pain_points.map((p, i) => (
                        <li key={i} className="text-xs text-[#78614E] flex gap-1.5">
                          <span className="text-red-400 shrink-0">•</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.praise_themes?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#292524] mb-1">What they love</p>
                    <ul className="space-y-0.5">
                      {result.praise_themes.map((p, i) => (
                        <li key={i} className="text-xs text-[#78614E] flex gap-1.5">
                          <span className="text-green-500 shrink-0">•</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CTAs tab */}
          {section === "cta" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#292524] mb-2">CTA Suggestions</p>
              {result.cta_suggestions?.map((cta, i) => (
                <div key={i} className="flex items-start gap-2 bg-[#FFFCF7] border border-[#F5D7A0]/40 rounded-lg p-2.5">
                  <span className="text-[#F59E0B] text-xs font-bold shrink-0">{i + 1}.</span>
                  <p className="text-xs text-[#292524] flex-1">{cta}</p>
                  <button onClick={() => copyText(cta, `cta-${i}`)}
                    className="text-[#A8967E] hover:text-[#292524] shrink-0">
                    {copied === `cta-${i}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              ))}

              {result.criticism_themes?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-[#292524] mb-1">Criticism themes</p>
                  <ul className="space-y-0.5">
                    {result.criticism_themes.map((c, i) => (
                      <li key={i} className="text-xs text-[#78614E] flex gap-1.5">
                        <span className="text-orange-400 shrink-0">•</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#E8D9C5] rounded-lg mb-1 overflow-hidden">
      <button className="w-full flex items-center justify-between px-3 py-2 text-left text-xs font-medium text-[#292524] hover:bg-[#FFFCF7] transition-colors"
        onClick={() => setOpen(o => !o)}>
        <span>{item.q}</span>
        {open ? <ChevronUp className="w-3 h-3 shrink-0 text-[#A8967E]" /> : <ChevronDown className="w-3 h-3 shrink-0 text-[#A8967E]" />}
      </button>
      {open && (
        <div className="px-3 pb-2.5 space-y-1.5 bg-[#FFFCF7]">
          <p className="text-xs text-[#3D2E1E]">{item.a}</p>
          <p className="text-xs text-[#A8967E] italic">Why it matters: {item.why_it_matters}</p>
        </div>
      )}
    </div>
  );
}
