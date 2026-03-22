"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { formatNumber, formatDate } from "@/lib/utils";
import { Users, Eye, PlayCircle, ThumbsUp, MessageCircle, TrendingUp, Youtube, ChevronUp, ChevronDown } from "lucide-react";

const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };

export default function MyChannelPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string>("publishedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  useEffect(() => {
    fetch("/api/youtube/my-channel")
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Eroare de conexiune"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <Header title="My Channel" subtitle="Statistici canal YouTube" />
        <div className="p-6 flex items-center justify-center h-64">
          <p style={{ color: "#C4AA8A" }}>Se incarca...</p>
        </div>
      </div>
    );
  }

  if (error === "No channel connected") {
    return (
      <div>
        <Header title="My Channel" subtitle="Statistici canal YouTube" />
        <div className="p-6">
          <div className="rounded-xl p-8 text-center" style={cardStyle}>
            <Youtube className="w-12 h-12 mx-auto mb-4" style={{ color: "#FF0000" }} />
            <h3 className="font-bold text-lg mb-2" style={{ color: "#292524" }}>Canal neconectat</h3>
            <p className="text-sm mb-4" style={{ color: "#A8967E" }}>
              Mergi la Settings si adauga Channel ID-ul tau YouTube.
            </p>
            <a href="/settings" className="inline-flex px-5 py-2.5 rounded-lg text-sm font-bold" style={{ backgroundColor: "#FF0000", color: "white" }}>
              Mergi la Settings →
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="My Channel" subtitle="Statistici canal YouTube" />
        <div className="p-6">
          <div className="rounded-xl p-6" style={cardStyle}>
            <p className="text-sm" style={{ color: "#dc2626" }}>Eroare: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    { icon: <Users className="w-4 h-4" />, label: "Subscribers", val: formatNumber(data.subscribers), color: "#FF0000" },
    { icon: <Eye className="w-4 h-4" />, label: "Total Views", val: formatNumber(data.totalViews), color: "#F59E0B" },
    { icon: <PlayCircle className="w-4 h-4" />, label: "Videos", val: formatNumber(data.videoCount), color: "#39D3B8" },
    { icon: <TrendingUp className="w-4 h-4" />, label: "Avg Views/Video", val: data.videoCount > 0 ? formatNumber(Math.round(data.totalViews / data.videoCount)) : "—", color: "#4F4DF0" },
  ];

  return (
    <div>
      <Header title="My Channel" subtitle="Statistici canal YouTube" />

      <div className="p-6 space-y-6">
        {/* Channel Header */}
        <div className="rounded-xl p-5 flex items-center gap-4" style={cardStyle}>
          {data.thumbnail && (
            <img src={data.thumbnail} alt="" className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Youtube className="w-4 h-4 flex-shrink-0" style={{ color: "#FF0000" }} />
              <h2 className="font-bold text-lg truncate" style={{ color: "#292524" }}>{data.name}</h2>
            </div>
            {data.description && (
              <p className="text-xs line-clamp-2" style={{ color: "#A8967E" }}>{data.description}</p>
            )}
            <p className="text-xs mt-1" style={{ color: "#C4AA8A" }}>
              Pe YouTube din {formatDate(data.publishedAt)}{data.country ? ` · ${data.country}` : ""}
            </p>
          </div>
          <a
            href={`https://www.youtube.com/channel/${data.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: "#FF0000", color: "white" }}
          >
            Vezi canal →
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(s => (
            <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
              <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>
                {s.icon}
                <span className="text-xs font-semibold" style={{ color: "#A8967E" }}>{s.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: "#292524" }}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Recent Videos */}
        {data.videos?.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
              <h3 className="font-semibold" style={{ color: "#292524" }}>Ultimele videoclipuri</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide" style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#A8967E" }}>
                    <th className="text-left px-5 py-3">Video</th>
                    {[
                      { key: "views", label: "Views" },
                      { key: "likes", label: "Likes" },
                      { key: "comments", label: "Comments" },
                      { key: "er", label: "ER" },
                      { key: "publishedAt", label: "Publicat" },
                    ].map(col => (
                      <th key={col.key} className="text-right px-3 py-3 cursor-pointer select-none"
                        onClick={() => handleSort(col.key)}>
                        <div className="flex items-center justify-end gap-1">
                          {col.label}<SortIcon col={col.key} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...data.videos].map((v: any) => { v._er = v.views > 0 ? ((v.likes + v.comments) / v.views) * 100 : 0; return v; })
                    .sort((a: any, b: any) => {
                      const val = (x: any) => sortKey === "er" ? x._er : sortKey === "publishedAt" ? new Date(x.publishedAt).getTime() : x[sortKey];
                      return sortDir === "asc" ? val(a) - val(b) : val(b) - val(a);
                    })
                    .map((v: any) => {
                    const er = v.views > 0 ? (((v.likes + v.comments) / v.views) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={v.id} className="transition-colors" style={{ borderTop: "1px solid rgba(245,215,160,0.15)" }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <a href={v.permalink} target="_blank" rel="noopener noreferrer"
                              className="w-20 h-11 rounded-md overflow-hidden flex-shrink-0 block"
                              style={{ backgroundColor: "#EDE0C8" }}>
                              <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                            </a>
                            <div>
                              <a href={v.permalink} target="_blank" rel="noopener noreferrer"
                                className="font-medium text-xs leading-tight max-w-[280px] truncate block hover:underline"
                                style={{ color: "#3D2E1E" }}>
                                {v.title}
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-xs" style={{ color: "#5C4A35" }}>
                          {formatNumber(v.views)}
                        </td>
                        <td className="px-3 py-3 text-right text-xs" style={{ color: "#A8967E" }}>
                          <div className="flex items-center justify-end gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {formatNumber(v.likes)}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-xs" style={{ color: "#A8967E" }}>
                          <div className="flex items-center justify-end gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {formatNumber(v.comments)}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                            {er}%
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-xs" style={{ color: "#C4AA8A" }}>
                          {formatDate(v.publishedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
