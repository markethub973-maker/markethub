"use client";
import { useState, useEffect } from "react";
import { formatNumber } from "@/lib/utils";

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

export default function MultiRegionalTrending() {
  const [data, setData] = useState<Record<string, RegionData>>({});
  const [loading, setLoading] = useState(true);
  const [activeRegion, setActiveRegion] = useState("RO");
  const [regions, setRegions] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/youtube/multi-regional?regions=RO,US,GB,DE&max=10");
        const json = await res.json();
        setData(json.regions || {});
        setRegions(json.requested_regions || []);
        if (json.requested_regions?.[0]) setActiveRegion(json.requested_regions[0]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const current = data[activeRegion];

  return (
    <div className="bg-white border border-[#E8D9C5] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🌍</span>
        <h3 className="font-semibold text-[#292524] text-sm">Trending by Country</h3>
        <span className="text-xs text-[#C4AA8A]">YouTube</span>
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
      ) : !current?.videos?.length ? (
        <p className="text-xs text-[#C4AA8A]">No trending data available.</p>
      ) : (
        <div className="space-y-2">
          {current.videos.map((v, i) => (
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
