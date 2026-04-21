"use client";

/**
 * Brain Preferences — Tab "Brain Preferences".
 * View and override brain profile data: niche, tone, format, platforms, posting times.
 * Fetches from /api/user/brain-profile.
 */

import { useState, useCallback, useEffect } from "react";
import { Save, Brain, RotateCcw, Clock, BarChart3, Target } from "lucide-react";

interface BrainProfile {
  id?: string;
  niche_detected: string;
  preferred_tone: string;
  preferred_format: string;
  preferred_platforms: string[];
  best_posting_times: Record<string, string[]>; // { monday: ["09:00","18:00"], ... }
  learning_confidence: number; // 0-100
  total_campaigns: number;
  success_ratio: number; // 0-100
}

const EMPTY_PROFILE: BrainProfile = {
  niche_detected: "",
  preferred_tone: "professional",
  preferred_format: "carousel",
  preferred_platforms: [],
  best_posting_times: {},
  learning_confidence: 0,
  total_campaigns: 0,
  success_ratio: 0,
};

const TONE_OPTIONS = [
  "professional", "casual", "friendly", "authoritative", "witty",
  "inspirational", "educational", "conversational", "bold", "empathetic",
];

const FORMAT_OPTIONS = [
  "carousel", "single_image", "video", "reel", "story",
  "text_only", "infographic", "poll", "thread", "live",
];

const PLATFORM_OPTIONS = [
  { id: "instagram", label: "Instagram", icon: "📸" },
  { id: "facebook", label: "Facebook", icon: "📘" },
  { id: "linkedin", label: "LinkedIn", icon: "💼" },
  { id: "tiktok", label: "TikTok", icon: "🎵" },
  { id: "twitter", label: "X / Twitter", icon: "🐦" },
  { id: "youtube", label: "YouTube", icon: "📺" },
  { id: "pinterest", label: "Pinterest", icon: "📌" },
  { id: "threads", label: "Threads", icon: "🧵" },
];

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const HOURS = ["06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"];

export default function BrainPreferences() {
  const [profile, setProfile] = useState<BrainProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [resetting, setResetting] = useState(false);

  // Load brain profile
  useEffect(() => {
    fetch("/api/user/brain-profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setProfile({
            id: d.profile.id,
            niche_detected: d.profile.niche_detected || d.profile.detected_niche || "",
            preferred_tone: d.profile.preferred_tone || "professional",
            preferred_format: d.profile.preferred_format || "carousel",
            preferred_platforms: d.profile.preferred_platforms || [],
            best_posting_times: d.profile.best_posting_times || {},
            learning_confidence: d.profile.learning_confidence ?? 0,
            total_campaigns: d.profile.total_campaigns ?? 0,
            success_ratio: d.profile.success_ratio ?? 0,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = useCallback((partial: Partial<BrainProfile>) => {
    setProfile((prev) => ({ ...prev, ...partial }));
  }, []);

  const togglePlatform = useCallback((platformId: string) => {
    setProfile((prev) => {
      const current = prev.preferred_platforms || [];
      const next = current.includes(platformId)
        ? current.filter((p) => p !== platformId)
        : [...current, platformId];
      return { ...prev, preferred_platforms: next };
    });
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/user/brain-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: profile.niche_detected,
          preferred_tone: profile.preferred_tone,
          preferred_format: profile.preferred_format,
          preferred_platforms: profile.preferred_platforms,
        }),
      });
      if (res.ok) {
        setMsg("Saved!");
      } else {
        const d = await res.json();
        setMsg(d.error || "Error saving");
      }
    } catch {
      setMsg("Error saving");
    }
    setSaving(false);
    setTimeout(() => setMsg(""), 2000);
  }, [profile]);

  const resetBrain = useCallback(async () => {
    if (!confirm("Reset your brain profile? This clears all learned preferences. This action cannot be undone.")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/user/brain-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      if (res.ok) {
        setProfile(EMPTY_PROFILE);
        setMsg("Profile reset");
      }
    } catch {
      setMsg("Error resetting");
    }
    setResetting(false);
    setTimeout(() => setMsg(""), 2000);
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ background: "#FFFCF7" }}>
        <span className="text-sm" style={{ color: "#A8967E" }}>Loading brain profile...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto" style={{ background: "#FFFCF7" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "#2D2620" }}>
            <Brain className="w-5 h-5" style={{ color: "#F59E0B" }} />
            Brain Preferences
          </h2>
          <p className="text-xs mt-1" style={{ color: "#A8967E" }}>
            View and override what the brain has learned about your content strategy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {msg && (
            <span className="text-xs font-medium" style={{ color: msg === "Saved!" || msg === "Profile reset" ? "#16A34A" : "#DC2626" }}>
              {msg}
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white w-full sm:w-auto justify-center"
            style={{ background: "#F59E0B" }}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            icon={<BarChart3 className="w-4 h-4" style={{ color: "#F59E0B" }} />}
            label="Total Campaigns"
            value={String(profile.total_campaigns)}
          />
          <StatCard
            icon={<Target className="w-4 h-4" style={{ color: "#10B981" }} />}
            label="Success Ratio"
            value={`${profile.success_ratio}%`}
          />
          <StatCard
            icon={<Brain className="w-4 h-4" style={{ color: "#8B5CF6" }} />}
            label="Learning Confidence"
            value={`${profile.learning_confidence}%`}
          />
        </div>

        {/* Learning confidence bar */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(200,180,150,0.3)", background: "#FFFFFF" }}
        >
          <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: "#78614E" }}>
            Learning Progress
          </label>
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "rgba(200,180,150,0.2)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${profile.learning_confidence}%`,
                background: profile.learning_confidence > 70
                  ? "linear-gradient(90deg, #F59E0B, #10B981)"
                  : profile.learning_confidence > 30
                  ? "linear-gradient(90deg, #F59E0B, #FBBF24)"
                  : "#F59E0B",
              }}
            />
          </div>
          <p className="text-xs mt-1.5" style={{ color: "#C4AA8A" }}>
            {profile.learning_confidence < 20
              ? "Just getting started. More campaigns will improve accuracy."
              : profile.learning_confidence < 50
              ? "Building knowledge. Keep creating content for better suggestions."
              : profile.learning_confidence < 80
              ? "Good understanding of your style. Suggestions are getting accurate."
              : "Strong confidence. The brain has a solid understanding of your strategy."}
          </p>
        </div>

        {/* Detected niche */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(200,180,150,0.3)", background: "#FFFFFF" }}
        >
          <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: "#78614E" }}>
            Detected Niche
          </label>
          <input
            type="text"
            value={profile.niche_detected}
            onChange={(e) => update({ niche_detected: e.target.value })}
            placeholder="e.g. Digital Marketing Agency"
            className="w-full px-3 py-2 text-sm rounded-lg border"
            style={{ borderColor: "rgba(200,180,150,0.3)", color: "#2D2620", background: "#FFFCF7" }}
          />
          <p className="text-xs mt-1" style={{ color: "#C4AA8A" }}>
            Auto-detected from your content. Override if incorrect.
          </p>
        </div>

        {/* Preferred tone */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(200,180,150,0.3)", background: "#FFFFFF" }}
        >
          <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: "#78614E" }}>
            Preferred Tone
          </label>
          <select
            value={profile.preferred_tone}
            onChange={(e) => update({ preferred_tone: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border"
            style={{ borderColor: "rgba(200,180,150,0.3)", color: "#2D2620", background: "#FFFCF7" }}
          >
            {TONE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Preferred format */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(200,180,150,0.3)", background: "#FFFFFF" }}
        >
          <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: "#78614E" }}>
            Preferred Format
          </label>
          <select
            value={profile.preferred_format}
            onChange={(e) => update({ preferred_format: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border"
            style={{ borderColor: "rgba(200,180,150,0.3)", color: "#2D2620", background: "#FFFCF7" }}
          >
            {FORMAT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Preferred platforms */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(200,180,150,0.3)", background: "#FFFFFF" }}
        >
          <label className="text-xs font-bold uppercase tracking-wider block mb-3" style={{ color: "#78614E" }}>
            Preferred Platforms
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PLATFORM_OPTIONS.map((p) => {
              const isSelected = profile.preferred_platforms.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all"
                  style={{
                    borderColor: isSelected ? "#F59E0B" : "rgba(200,180,150,0.25)",
                    background: isSelected ? "rgba(245,158,11,0.1)" : "transparent",
                    color: isSelected ? "#2D2620" : "#A8967E",
                  }}
                >
                  <span>{p.icon}</span>
                  <span className="truncate">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Best posting times (read-only grid) */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(200,180,150,0.3)", background: "#FFFFFF" }}
        >
          <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-3" style={{ color: "#78614E" }}>
            <Clock className="w-3.5 h-3.5" />
            Best Posting Times
          </label>
          <p className="text-xs mb-3" style={{ color: "#C4AA8A" }}>
            Learned from engagement data. Read-only — the brain updates this automatically.
          </p>
          <div className="overflow-x-auto -mx-2 px-2">
            <div className="min-w-[500px]">
              {/* Hours header */}
              <div className="flex gap-0.5 mb-1 pl-16">
                {HOURS.map((h) => (
                  <div key={h} className="flex-1 text-center text-[9px]" style={{ color: "#C4AA8A" }}>
                    {h}
                  </div>
                ))}
              </div>
              {/* Day rows */}
              {DAYS.map((day) => {
                const dayTimes = profile.best_posting_times[day] || [];
                return (
                  <div key={day} className="flex items-center gap-0.5 mb-0.5">
                    <span className="w-14 text-right text-[10px] pr-2 capitalize shrink-0" style={{ color: "#A8967E" }}>
                      {day.slice(0, 3)}
                    </span>
                    {HOURS.map((h) => {
                      const timeStr = `${h}:00`;
                      const isActive = dayTimes.includes(timeStr);
                      return (
                        <div
                          key={h}
                          className="flex-1 h-4 rounded-sm"
                          style={{
                            background: isActive ? "#F59E0B" : "rgba(200,180,150,0.1)",
                            opacity: isActive ? 0.8 : 1,
                          }}
                          title={isActive ? `${day} ${timeStr} — recommended` : ""}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reset button */}
        <div className="pt-2 border-t" style={{ borderColor: "rgba(200,180,150,0.15)" }}>
          <button
            onClick={resetBrain}
            disabled={resetting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border hover:bg-red-50 transition-colors w-full sm:w-auto justify-center"
            style={{ borderColor: "rgba(220,38,38,0.3)", color: "#DC2626" }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {resetting ? "Resetting..." : "Reset Brain Profile"}
          </button>
          <p className="text-xs mt-2" style={{ color: "#C4AA8A" }}>
            This clears all learned preferences and resets confidence to 0%. Use only if you want to start fresh.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="rounded-xl border p-3 flex items-center gap-3"
      style={{ borderColor: "rgba(200,180,150,0.3)", background: "#FFFFFF" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "rgba(245,158,11,0.1)" }}
      >
        {icon}
      </div>
      <div>
        <div className="text-sm font-bold" style={{ color: "#2D2620" }}>{value}</div>
        <div className="text-[10px]" style={{ color: "#A8967E" }}>{label}</div>
      </div>
    </div>
  );
}
