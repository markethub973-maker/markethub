"use client";
import { useState, useEffect, useCallback } from "react";
import { formatNumber } from "@/lib/utils";
import { Search } from "lucide-react";

interface Video {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  views: number;
  likes: number;
  url: string;
}

interface RegionData {
  region: string;
  videos: Video[];
  error?: string;
}

const REGION_FLAGS: Record<string, string> = {
  RO: "🇷🇴",
  US: "🇺🇸",
  GB: "🇬🇧",
  DE: "🇩🇪",
  FR: "🇫🇷",
  IT: "🇮🇹",
};
const REGION_NAMES: Record<string, string> = {
  RO: "Romania",
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  IT: "Italy",
};

// YouTube category IDs
const CATEGORIES: Array<{ id: string; label: string }> = [
  { id: "", label: "All" },
  { id: "10", label: "Music" },
  { id: "20", label: "Gaming" },
  { id: "22", label: "People & Blogs" },
  { id: "23", label: "Comedy" },
  { id: "24", label: "Entertainment" },
  { id: "25", label: "News & Politics" },
  { id: "26", label: "How-to & Style" },
  { id: "27", label: "Education" },
  { id: "28", label: "Sci & Tech" },
  { id: "17", label: "Sports" },
];

export default function MultiRegionalTrending() {
  const [data, setData] = useState<Record<string, RegionData>>({});
  const [loading, setLoading] = useState(true);
  const [activeRegion, setActiveRegion] = useState("RO");
  const [regions, setRegions] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  const load = useCallback(async (catId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ regions: "RO,US,GB,DE", max: "10" });
      if (catId) params.set("categoryId", catId);
      const res = await fetch(`/api/youtube/multi-regional?${params}`);
      const json = await res.json();
      setData(json.regions || {});
      setRegions(json.requested_regions || []);
      if (json.requested_regions?.[0]) setActiveRegion(json.requested_regions[0]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(""); }, [load]);

  const current = data[activeRegion];

  // Client-side keyword filter
  const filteredVideos = keyword
    ? (current?.videos || []).filter(v =>
        v.title.toLowerCase().includes(keyword.toLowerCase()) ||
        v.channel.toLowerCase().includes(keyword.toLowerCase())
      )
    : current?.videos || [];

  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    load(catId);
  };

  const applyKeyword = () => setKeyword(keywordInput);

  return (
    <div className="bg-white border border-[#E8D9C5] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🌍</span>
        <h3 className="font-semibold text-[#292524] text-sm">Trending by Country</h3>
        <span className="text-xs text-[#C4AA8A]">YouTube</span>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1 mb-3">
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => handleCategoryChange(cat.id)}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${categoryId === cat.id ? "bg-[#292524] text-white border-[#292524]" : "bg-white text-[#78614E] border-[#E8D9C5] hover:border-[#F59E0B]"}`}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Keyword filter */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#C4AA8A]" />
          <input
            value={keywordInput}
            onChange={e => setKeywordInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && applyKeyword()}
            placeholder="Filter by keyword..."
            className="w-full text-sm pl-8 pr-3 py-1.5 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524] placeholder:text-[#C4AA8A]"
          />
        </div>
        <button onClick={applyKeyword}
          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#F59E0B] text-white hover:bg-[#D97706] transition-colors">
          Filter
        </button>
        {keyword && (
          <button onClick={() => { setKeyword(""); setKeywordInput(""); }}
            className="px-3 py-1.5 text-xs text-[#A8967E] hover:text-[#292524] transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Region tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {regions.map(r => (
          <button
            key={r}
            onClick={() => setActiveRegion(r)}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${activeRegion === r ? "bg-[#292524] text-white" : "bg-[#F5D7A0]/30 text-[#78614E] hover:bg-[#F5D7A0]/60"}`}
          >
            {REGION_FLAGS[r] || "🌐"} {REGION_NAMES[r] || r}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-[#F5D7A0]/20 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : current?.error ? (
        <p className="text-xs text-red-500">{current.error}</p>
      ) : !filteredVideos.length ? (
        <p className="text-xs text-[#C4AA8A]">{keyword ? `No results for "${keyword}"` : "No trending data available."}</p>
      ) : (
        <div className="space-y-2">
          {filteredVideos.map((v, i) => (
            <a
              key={v.id}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#FFF8F0] transition-colors group"
            >
              <span className="text-xs font-bold text-[#C4AA8A] w-5 text-center shrink-0">{i + 1}</span>
              {v.thumbnail && (
                <img src={v.thumbnail} alt={v.title} className="w-16 h-10 rounded object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#292524] line-clamp-2 leading-snug">{v.title}</p>
                <p className="text-xs text-[#C4AA8A] truncate mt-0.5">{v.channel}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-[#292524]">{formatNumber(v.views)}</p>
                <p className="text-xs text-[#C4AA8A]">views</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
