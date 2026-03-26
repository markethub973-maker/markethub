"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Instagram, Users, Heart, MessageCircle, Image, ExternalLink, RefreshCw, TrendingUp, Eye, UserCheck } from "lucide-react";

interface InstagramProfile {
  id: string;
  name: string;
  username: string;
  biography: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  profile_picture_url: string;
  website: string;
}

interface InstagramPost {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  permalink: string;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function InstagramPage() {
  const [profile, setProfile] = useState<InstagramProfile | null>(null);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setError("");
      const res = await fetch("/api/instagram");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setProfile(data.profile);
        setPosts(data.media || []);
      }
    } catch {
      setError("Could not load Instagram data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen bg-[#0f1117]">
        <Header title="My Instagram" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading Instagram data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#0f1117]">
      <Header title="My Instagram" />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 rounded-xl flex items-center justify-center">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Instagram Analytics</h1>
              <p className="text-gray-400 text-sm">Real data from your Instagram Business account</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1d27] border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-pink-500/50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400">
            ⚠️ {error}
          </div>
        )}

        {profile && (
          <>
            {/* Profile Card */}
            <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-6">
                {profile.profile_picture_url ? (
                  <img
                    src={profile.profile_picture_url}
                    alt={profile.username}
                    className="w-20 h-20 rounded-full object-cover border-2 border-pink-500/50"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <Instagram className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-white">{profile.name}</h2>
                    <span className="text-sm text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full">
                      Business
                    </span>
                  </div>
                  <p className="text-gray-400 mb-2">@{profile.username}</p>
                  {profile.biography && (
                    <p className="text-gray-300 text-sm mb-3">{profile.biography}</p>
                  )}
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-400 text-sm hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {profile.website.replace(/^https?:\/\//, "").substring(0, 50)}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#1a1d27] border border-white/10 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-pink-400" />
                  <span className="text-gray-400 text-sm">Followers</span>
                </div>
                <p className="text-2xl font-bold text-white">{formatNumber(profile.followers_count)}</p>
              </div>
              <div className="bg-[#1a1d27] border border-white/10 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-400 text-sm">Following</span>
                </div>
                <p className="text-2xl font-bold text-white">{formatNumber(profile.follows_count)}</p>
              </div>
              <div className="bg-[#1a1d27] border border-white/10 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Image className="w-4 h-4 text-orange-400" />
                  <span className="text-gray-400 text-sm">Posts</span>
                </div>
                <p className="text-2xl font-bold text-white">{profile.media_count}</p>
              </div>
              <div className="bg-[#1a1d27] border border-white/10 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400 text-sm">Engagement</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {profile.followers_count > 0
                    ? ((posts.reduce((s, p) => s + p.like_count + p.comments_count, 0) / Math.max(posts.length, 1) / profile.followers_count) * 100).toFixed(2) + "%"
                    : "N/A"}
                </p>
              </div>
            </div>

            {/* Posts Grid */}
            <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                <Image className="w-4 h-4 text-pink-400" />
                Recent Posts ({posts.length})
              </h3>

              {posts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Instagram className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No posts available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-[#0f1117] border border-white/5 rounded-xl overflow-hidden hover:border-pink-500/30 transition-all group"
                    >
                      {/* Post Image */}
                      <div className="relative aspect-square bg-[#0a0c14] flex items-center justify-center">
                        {post.media_url ? (
                          <img
                            src={post.media_url}
                            alt={post.caption || "Post Instagram"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Instagram className="w-12 h-12 text-gray-700" />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-6">
                          <div className="flex items-center gap-1 text-white">
                            <Heart className="w-5 h-5" />
                            <span>{post.like_count}</span>
                          </div>
                          <div className="flex items-center gap-1 text-white">
                            <MessageCircle className="w-5 h-5" />
                            <span>{post.comments_count}</span>
                          </div>
                        </div>
                      </div>

                      {/* Post Info */}
                      <div className="p-4">
                        {post.caption && (
                          <p className="text-gray-300 text-sm mb-3 line-clamp-2">{post.caption}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3 text-pink-400" />
                              {post.like_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3 text-blue-400" />
                              {post.comments_count}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">{timeAgo(post.timestamp)}</span>
                            <a
                              href={post.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-pink-400 hover:text-pink-300 transition-colors"
                            >
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
          </>
        )}
      </main>
    </div>
  );
}
