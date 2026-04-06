"use client";

import { useState } from "react";
import {
  Sparkles,
  Copy,
  Check,
  Loader2,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Hash,
  Smile,
  RefreshCw,
  BookmarkPlus,
  Bookmark,
} from "lucide-react";

const platforms = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "#E4405F" },
  { id: "facebook", label: "Facebook", icon: Facebook, color: "#1877F2" },
  { id: "tiktok", label: "TikTok", icon: Sparkles, color: "#00F2EA" },
  { id: "twitter", label: "Twitter/X", icon: Twitter, color: "#1DA1F2" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
  { id: "youtube", label: "YouTube", icon: Youtube, color: "#FF0000" },
];

const tones = [
  "Engaging", "Professional", "Funny", "Inspirational", "Educational",
  "Casual", "Urgent", "Storytelling", "Provocative", "Empathetic",
];

const languages = [
  // Europe
  "English", "Spanish", "French", "German", "Italian", "Portuguese", "Romanian",
  "Dutch", "Polish", "Swedish", "Norwegian", "Danish", "Finnish", "Czech",
  "Slovak", "Hungarian", "Greek", "Bulgarian", "Croatian", "Serbian",
  "Ukrainian", "Russian", "Turkish", "Catalan", "Basque", "Galician",
  // Middle East & Africa
  "Arabic", "Hebrew", "Persian", "Swahili", "Afrikaans", "Amharic",
  // Asia
  "Hindi", "Bengali", "Urdu", "Japanese", "Korean", "Chinese (Simplified)",
  "Chinese (Traditional)", "Cantonese", "Thai", "Vietnamese", "Indonesian",
  "Malay", "Filipino", "Tamil", "Telugu", "Marathi", "Punjabi", "Gujarati",
  // Americas
  "Mexican Spanish", "Brazilian Portuguese",
];

type Caption = {
  caption: string;
  hashtags: string[];
  charCount: number;
};

type SavedCaption = Caption & {
  id: string;
  topic: string;
  platform: string;
  savedAt: string;
};

export default function CaptionsPage() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [tone, setTone] = useState("Engaging");
  const [language, setLanguage] = useState("English");
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmoji, setIncludeEmoji] = useState(true);
  const [maxLength, setMaxLength] = useState("");
  const [loading, setLoading] = useState(false);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [error, setError] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [tab, setTab] = useState<"generate" | "saved">("generate");
  const [savedCaptions, setSavedCaptions] = useState<SavedCaption[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("mhp_saved_captions");
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    setCaptions([]);

    try {
      const res = await fetch("/api/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          platform,
          tone,
          language,
          includeHashtags,
          includeEmoji,
          maxLength: maxLength ? parseInt(maxLength) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setCaptions(data.captions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCaption = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const saveCaption = (caption: Caption) => {
    const entry: SavedCaption = {
      ...caption,
      id: Date.now().toString(),
      topic,
      platform,
      savedAt: new Date().toISOString(),
    };
    const updated = [entry, ...savedCaptions];
    setSavedCaptions(updated);
    localStorage.setItem("mhp_saved_captions", JSON.stringify(updated));
  };

  const removeSaved = (id: string) => {
    const updated = savedCaptions.filter((c) => c.id !== id);
    setSavedCaptions(updated);
    localStorage.setItem("mhp_saved_captions", JSON.stringify(updated));
  };

  const isSaved = (caption: string) =>
    savedCaptions.some((s) => s.caption === caption);

  const selectedPlatform = platforms.find((p) => p.id === platform);

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "#13100D", color: "#FFF8F0" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)" }}>
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              AI Caption Generator
            </h1>
            <p className="text-sm mt-1" style={{ color: "#A8967E" }}>
              Generate creative AI captions for any platform
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "rgba(255,248,240,0.05)" }}>
            {(["generate", "saved"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-2 rounded-md text-sm font-medium transition-all"
                style={tab === t ? { backgroundColor: "rgba(139,92,246,0.2)", color: "#A78BFA" } : { color: "#A8967E" }}
              >
                {t === "generate" ? "Generator" : `Saved (${savedCaptions.length})`}
              </button>
            ))}
          </div>
        </div>

        {tab === "generate" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Settings */}
            <div className="lg:col-span-1 space-y-5">
              <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: "#1C1814", border: "1px solid rgba(245,215,160,0.08)" }}>
                {/* Topic */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#F5D7A0" }}>
                    Subject / Product
                  </label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ex: Summer collection launch, Italian restaurant promo, online marketing course..."
                    rows={3}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
                    style={{ backgroundColor: "rgba(255,248,240,0.05)", border: "1px solid rgba(245,215,160,0.1)", color: "#FFF8F0" }}
                  />
                </div>

                {/* Platform */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#F5D7A0" }}>
                    Platform
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {platforms.map((p) => {
                      const Icon = p.icon;
                      const active = platform === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setPlatform(p.id)}
                          className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg text-xs font-medium transition-all"
                          style={active ? {
                            backgroundColor: `${p.color}20`,
                            border: `1px solid ${p.color}50`,
                            color: p.color,
                          } : {
                            backgroundColor: "rgba(255,248,240,0.03)",
                            border: "1px solid rgba(245,215,160,0.06)",
                            color: "#A8967E",
                          }}
                        >
                          <Icon className="w-4 h-4" />
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tone */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#F5D7A0" }}>
                    Tone
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {tones.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTone(t)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                        style={tone === t ? {
                          backgroundColor: "rgba(139,92,246,0.2)",
                          border: "1px solid rgba(139,92,246,0.4)",
                          color: "#A78BFA",
                        } : {
                          backgroundColor: "rgba(255,248,240,0.03)",
                          border: "1px solid rgba(245,215,160,0.06)",
                          color: "#A8967E",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#F5D7A0" }}>
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: "rgba(255,248,240,0.05)", border: "1px solid rgba(245,215,160,0.1)", color: "#FFF8F0" }}
                  >
                    {languages.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                {/* Options */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeHashtags}
                      onChange={(e) => setIncludeHashtags(e.target.checked)}
                      className="rounded"
                    />
                    <Hash className="w-3.5 h-3.5" style={{ color: "#A78BFA" }} />
                    <span className="text-xs" style={{ color: "#A8967E" }}>Hashtags</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeEmoji}
                      onChange={(e) => setIncludeEmoji(e.target.checked)}
                      className="rounded"
                    />
                    <Smile className="w-3.5 h-3.5" style={{ color: "#A78BFA" }} />
                    <span className="text-xs" style={{ color: "#A8967E" }}>Emoji</span>
                  </label>
                </div>

                {/* Max length */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#F5D7A0" }}>
                    Character limit (optional)
                  </label>
                  <input
                    type="number"
                    value={maxLength}
                    onChange={(e) => setMaxLength(e.target.value)}
                    placeholder="Ex: 300"
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: "rgba(255,248,240,0.05)", border: "1px solid rgba(245,215,160,0.1)", color: "#FFF8F0" }}
                  />
                </div>

                {/* Generate */}
                <button
                  onClick={generate}
                  disabled={loading || !topic.trim()}
                  className="w-full py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)", color: "#FFF" }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Captions
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Results */}
            <div className="lg:col-span-2 space-y-4">
              {error && (
                <div className="rounded-lg p-4 text-sm" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5" }}>
                  {error}
                </div>
              )}

              {loading && (
                <div className="rounded-xl p-12 flex flex-col items-center gap-4" style={{ backgroundColor: "#1C1814", border: "1px solid rgba(245,215,160,0.08)" }}>
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#A78BFA" }} />
                  <p className="text-sm" style={{ color: "#A8967E" }}>AI is generating creative captions...</p>
                </div>
              )}

              {!loading && captions.length === 0 && !error && (
                <div className="rounded-xl p-12 flex flex-col items-center gap-4 text-center" style={{ backgroundColor: "#1C1814", border: "1px solid rgba(245,215,160,0.08)" }}>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))" }}>
                    <Sparkles className="w-8 h-8" style={{ color: "#A78BFA" }} />
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: "#F5D7A0" }}>Generate captions with AI</p>
                    <p className="text-sm mt-1" style={{ color: "#A8967E" }}>
                      Fill in the subject and select the platform, then click generate
                    </p>
                  </div>
                </div>
              )}

              {captions.map((c, i) => (
                <div
                  key={i}
                  className="rounded-xl p-5 space-y-3"
                  style={{ backgroundColor: "#1C1814", border: "1px solid rgba(245,215,160,0.08)" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#A78BFA" }}>
                        Version {i + 1}
                      </span>
                      <span className="text-xs" style={{ color: "#A8967E" }}>
                        {c.charCount} chars
                      </span>
                      {selectedPlatform && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${selectedPlatform.color}15`, color: selectedPlatform.color }}>
                          {selectedPlatform.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => saveCaption(c)}
                        className="p-2 rounded-lg transition-all"
                        style={{ color: isSaved(c.caption) ? "#A78BFA" : "#A8967E" }}
                        title="Save"
                      >
                        {isSaved(c.caption) ? <Bookmark className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyCaption(c.caption + (c.hashtags?.length ? "\n\n" + c.hashtags.map((h) => `#${h}`).join(" ") : ""), i)}
                        className="p-2 rounded-lg transition-all"
                        style={{ color: copiedIdx === i ? "#10B981" : "#A8967E" }}
                        title="Copy"
                      >
                        {copiedIdx === i ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: "#FFF8F0" }}>
                    {c.caption}
                  </p>

                  {c.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2" style={{ borderTop: "1px solid rgba(245,215,160,0.06)" }}>
                      {c.hashtags.map((h, hi) => (
                        <span key={hi} className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#A78BFA" }}>
                          #{h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {captions.length > 0 && (
                <button
                  onClick={generate}
                  disabled={loading}
                  className="w-full py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: "rgba(255,248,240,0.05)", border: "1px solid rgba(245,215,160,0.1)", color: "#A8967E" }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Saved Tab */
          <div className="space-y-4">
            {savedCaptions.length === 0 ? (
              <div className="rounded-xl p-12 flex flex-col items-center gap-4 text-center" style={{ backgroundColor: "#1C1814", border: "1px solid rgba(245,215,160,0.08)" }}>
                <Bookmark className="w-8 h-8" style={{ color: "#A8967E" }} />
                <p className="text-sm" style={{ color: "#A8967E" }}>No saved captions</p>
              </div>
            ) : (
              savedCaptions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl p-5 space-y-3"
                  style={{ backgroundColor: "#1C1814", border: "1px solid rgba(245,215,160,0.08)" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${platforms.find((p) => p.id === s.platform)?.color || "#A78BFA"}15`, color: platforms.find((p) => p.id === s.platform)?.color || "#A78BFA" }}>
                        {platforms.find((p) => p.id === s.platform)?.label || s.platform}
                      </span>
                      <span className="text-xs" style={{ color: "#A8967E" }}>{s.topic}</span>
                      <span className="text-xs" style={{ color: "#6B5E50" }}>
                        {new Date(s.savedAt).toLocaleDateString("en-US")}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(s.caption + (s.hashtags?.length ? "\n\n" + s.hashtags.map((h) => `#${h}`).join(" ") : ""));
                        }}
                        className="p-2 rounded-lg"
                        style={{ color: "#A8967E" }}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeSaved(s.id)}
                        className="p-2 rounded-lg"
                        style={{ color: "#ef4444" }}
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: "#FFF8F0" }}>
                    {s.caption}
                  </p>
                  {s.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {s.hashtags.map((h, hi) => (
                        <span key={hi} className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#A78BFA" }}>
                          #{h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
