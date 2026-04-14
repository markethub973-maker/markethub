"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import ExportButtons from "@/components/ui/ExportButtons";
import {
  Instagram, Users, Heart, MessageCircle, Image, ExternalLink,
  RefreshCw, TrendingUp, UserCheck, BarChart2, Plus, Star, Zap
} from "lucide-react";
import Link from "next/link";

interface IGAccount {
  id: string;
  instagram_id: string;
  username: string;
  name: string;
  label: string;
  is_primary: boolean;
}

interface InstagramProfile {
  id: string; name: string; username: string; biography: string;
  followers_count: number; follows_count: number; media_count: number;
  profile_picture_url: string; website: string;
}

interface InstagramPost {
  id: string; caption?: string; media_type: string;
  media_url?: string; thumbnail_url?: string;
  timestamp: string; like_count: number; comments_count: number; permalink: string;
}

interface CompareAccount {
  id: string; instagram_id: string; username: string; name: string;
  label: string; is_primary: boolean;
  profile: InstagramProfile | null;
  engagement_rate: string;
  avg_likes: number; avg_comments: number;
  top_post: InstagramPost | null;
  recent_posts_count: number;
  error: string | null;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function timeAgo(ts: string): string {
  const days = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const COLORS = ["#E1306C", "#8B5CF6", "var(--color-primary)", "#10B981"];

export default function InstagramPage() {
  const [accounts, setAccounts] = useState<IGAccount[]>([]);
  const [activeTab, setActiveTab] = useState<string>(""); // instagram_id or "compare"
  const [profile, setProfile] = useState<InstagramProfile | null>(null);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [compareData, setCompareData] = useState<CompareAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Load account list
  useEffect(() => {
    fetch("/api/instagram/accounts")
      .then(r => r.json())
      .then(d => {
        const accs = d.accounts ?? [];
        setAccounts(accs);
        if (accs.length > 0) {
          const primary = accs.find((a: IGAccount) => a.is_primary) || accs[0];
          setActiveTab(primary.instagram_id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchAccount = useCallback(async (igId: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/instagram?account_id=${igId}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setProfile(null); setPosts([]); }
      else { setProfile(data.profile); setPosts(data.media || []); }
    } catch { setError("Could not load Instagram data"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const fetchCompare = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/instagram/compare");
      const data = await res.json();
      setCompareData(data.accounts ?? []);
    } catch { setError("Could not load comparison data"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    if (!activeTab) return;
    if (activeTab === "compare") fetchCompare();
    else fetchAccount(activeTab);
  }, [activeTab, fetchAccount, fetchCompare]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === "compare") fetchCompare();
    else fetchAccount(activeTab);
  };

  const noAccounts = !loading && accounts.length === 0;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#0f1117]">
      <Header title="My Instagram" />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 rounded-xl flex items-center justify-center">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Instagram Analytics</h1>
              <p className="text-gray-400 text-sm">
                {accounts.length > 0 ? `${accounts.length} account${accounts.length > 1 ? "s connected" : " connected"}` : "No accounts connected"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings?tab=integrations"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1d27] border border-white/10 rounded-lg text-gray-400 hover:text-pink-400 hover:border-pink-500/40 transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              Add account
            </Link>
            {accounts.length > 0 && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1d27] border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* No accounts */}
        {noAccounts && (
          <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-12 text-center">
            <Instagram className="w-16 h-16 text-pink-500/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Instagram accounts connected</h2>
            <p className="text-gray-400 mb-6">Connect your accounts to see real analytics.</p>
            <Link
              href="/settings?tab=integrations"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all"
            >
              <Plus className="w-4 h-4" />
              Connect Instagram
            </Link>
          </div>
        )}

        {/* Account tabs */}
        {accounts.length > 0 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {accounts.map((acc, i) => (
              <button
                key={acc.instagram_id}
                type="button"
                onClick={() => setActiveTab(acc.instagram_id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  activeTab === acc.instagram_id
                    ? "text-white border-pink-500/60 bg-pink-500/10"
                    : "text-gray-400 border-white/10 bg-[#1a1d27] hover:text-white hover:border-white/20"
                }`}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                @{acc.username}
                {acc.is_primary && <Star className="w-3 h-3 text-yellow-400" />}
              </button>
            ))}
            {accounts.length > 1 && (
              <button
                type="button"
                onClick={() => setActiveTab("compare")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  activeTab === "compare"
                    ? "text-white border-purple-500/60 bg-purple-500/10"
                    : "text-gray-400 border-white/10 bg-[#1a1d27] hover:text-white hover:border-white/20"
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                Compare ({accounts.length})
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading data...</p>
            </div>
          </div>
        )}

        {/* ── Single account view ── */}
        {!loading && activeTab !== "compare" && profile && (
          <>
            <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-6">
                {profile.profile_picture_url ? (
                  <img src={profile.profile_picture_url} alt={profile.username} className="w-20 h-20 rounded-full object-cover border-2 border-pink-500/50" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <Instagram className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-white">{profile.name}</h2>
                    <span className="text-sm text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full">Business</span>
                  </div>
                  <p className="text-gray-400 mb-2">@{profile.username}</p>
                  {profile.biography && <p className="text-gray-300 text-sm mb-3">{profile.biography}</p>}
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-pink-400 text-sm hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {profile.website.replace(/^https?:\/\//, "").substring(0, 50)}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Followers", value: fmt(profile.followers_count), icon: <Users className="w-4 h-4 text-pink-400" /> },
                { label: "Following", value: fmt(profile.follows_count), icon: <UserCheck className="w-4 h-4 text-purple-400" /> },
                { label: "Posts", value: profile.media_count, icon: <Image className="w-4 h-4 text-orange-400" /> },
                {
                  label: "Engagement",
                  value: profile.followers_count > 0
                    ? ((posts.reduce((s, p) => s + p.like_count + p.comments_count, 0) / Math.max(posts.length, 1) / profile.followers_count) * 100).toFixed(2) + "%"
                    : "N/A",
                  icon: <TrendingUp className="w-4 h-4 text-green-400" />
                },
              ].map(stat => (
                <div key={stat.label} className="bg-[#1a1d27] border border-white/10 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">{stat.icon}<span className="text-gray-400 text-sm">{stat.label}</span></div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                <Image className="w-4 h-4 text-pink-400" />
                Recent posts ({posts.length})
              </h3>
              {posts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Instagram className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No posts available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {posts.map(post => (
                    <div key={post.id} className="bg-[#0f1117] border border-white/5 rounded-xl overflow-hidden hover:border-pink-500/30 transition-all group">
                      <div className="relative aspect-square bg-[#0a0c14] flex items-center justify-center">
                        {post.media_url ? (
                          <img src={post.media_url} alt={post.caption || "Post"} className="w-full h-full object-cover" />
                        ) : (
                          <Instagram className="w-12 h-12 text-gray-700" />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-6">
                          <div className="flex items-center gap-1 text-white"><Heart className="w-5 h-5" /><span>{post.like_count}</span></div>
                          <div className="flex items-center gap-1 text-white"><MessageCircle className="w-5 h-5" /><span>{post.comments_count}</span></div>
                        </div>
                      </div>
                      <div className="p-4">
                        {post.caption && <p className="text-gray-300 text-sm mb-3 line-clamp-2">{post.caption}</p>}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400" />{post.like_count}</span>
                            <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-400" />{post.comments_count}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">{timeAgo(post.timestamp)}</span>
                            <a href={post.permalink} target="_blank" rel="noopener noreferrer" title="View on Instagram" className="text-pink-400 hover:text-pink-300">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {posts.length > 0 && (
              <div className="flex justify-end mt-4">
                <ExportButtons
                  filename={`instagram-${profile.username}`}
                  sheets={[{ name: "Posts", headers: ["Caption", "Likes", "Comments", "Type", "Date"], rows: posts.map(p => [p.caption || "", p.like_count, p.comments_count, p.media_type, p.timestamp]) }]}
                />
              </div>
            )}
          </>
        )}

        {/* ── Compare view ── */}
        {!loading && activeTab === "compare" && (
          <div className="space-y-6">
            {/* Metrics comparison table */}
            <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-purple-400" />
                Account comparison ({compareData.length})
              </h2>
              <div className={`grid gap-4 ${compareData.length === 2 ? "grid-cols-2" : compareData.length === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
                {compareData.map((acc, i) => (
                  <div key={acc.instagram_id} className="bg-[#0f1117] border border-white/10 rounded-xl p-5 relative">
                    {acc.is_primary && (
                      <span className="absolute top-3 right-3 flex items-center gap-1 text-xs text-yellow-400">
                        <Star className="w-3 h-3" /> Primary
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <div>
                        <p className="font-semibold text-white text-sm">@{acc.username}</p>
                        <p className="text-xs text-gray-500">{acc.label}</p>
                      </div>
                    </div>
                    {acc.error ? (
                      <p className="text-red-400 text-xs">{acc.error}</p>
                    ) : acc.profile ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-xs flex items-center gap-1"><Users className="w-3 h-3" /> Followers</span>
                          <span className="text-white font-bold">{fmt(acc.profile.followers_count)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-xs flex items-center gap-1"><Image className="w-3 h-3" /> Posts</span>
                          <span className="text-white font-bold">{acc.profile.media_count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-xs flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Engagement</span>
                          <span className="font-bold" style={{ color: COLORS[i % COLORS.length] }}>{acc.engagement_rate}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-xs flex items-center gap-1"><Heart className="w-3 h-3" /> Avg likes</span>
                          <span className="text-white font-bold">{fmt(acc.avg_likes)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-xs flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Avg comments</span>
                          <span className="text-white font-bold">{fmt(acc.avg_comments)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs">Loading...</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Winner highlight */}
            {compareData.filter(a => a.profile).length > 1 && (() => {
              const best = compareData.filter(a => a.profile).reduce((b, a) =>
                parseFloat(a.engagement_rate) > parseFloat(b.engagement_rate) ? a : b
              );
              const bestFollowers = compareData.filter(a => a.profile).reduce((b, a) =>
                (a.profile?.followers_count ?? 0) > (b.profile?.followers_count ?? 0) ? a : b
              );
              return (
                <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" /> Winners per category
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0f1117] rounded-xl p-4">
                      <p className="text-gray-400 text-xs mb-1">Highest engagement rate</p>
                      <p className="text-white font-bold">@{best.username}</p>
                      <p className="text-green-400 text-sm">{best.engagement_rate}%</p>
                    </div>
                    <div className="bg-[#0f1117] rounded-xl p-4">
                      <p className="text-gray-400 text-xs mb-1">Most followers</p>
                      <p className="text-white font-bold">@{bestFollowers.username}</p>
                      <p className="text-blue-400 text-sm">{fmt(bestFollowers.profile?.followers_count ?? 0)}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
