"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Music, PlayCircle, Disc } from "lucide-react";

const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const SpotifyGreen = "#1DB954";

export default function SpotifyPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/spotify/trending")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Eroare de conexiune"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Header title="Spotify Trending" subtitle="Muzica trending in Romania — date reale Spotify" />
      <div className="p-6 space-y-6">

        {loading && (
          <div className="flex items-center justify-center h-40">
            <p style={{ color: "#C4AA8A" }}>Se incarca datele Spotify...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-5" style={cardStyle}>
            <p className="text-sm" style={{ color: "#dc2626" }}>Eroare: {error}</p>
          </div>
        )}

        {data && (
          <>
            {/* Featured Playlists */}
            {data.playlists?.length > 0 && (
              <div className="rounded-xl p-5" style={cardStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <PlayCircle className="w-4 h-4" style={{ color: SpotifyGreen }} />
                  <h3 className="font-semibold" style={{ color: "#292524" }}>Playlisturi Featured — România</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {data.playlists.map((p: any) => (
                    <a key={p.id} href={p.permalink} target="_blank" rel="noopener noreferrer"
                      className="group block rounded-lg overflow-hidden transition-transform hover:scale-105">
                      <div className="aspect-square overflow-hidden rounded-lg mb-2">
                        {p.thumbnail
                          ? <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "rgba(29,185,84,0.1)" }}><Music className="w-8 h-8" style={{ color: SpotifyGreen }} /></div>
                        }
                      </div>
                      <p className="text-xs font-semibold leading-tight truncate" style={{ color: "#292524" }}>{p.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{p.tracks} tracks</p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* New Releases */}
            {data.albums?.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={cardStyle}>
                <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                  <Disc className="w-4 h-4" style={{ color: SpotifyGreen }} />
                  <h3 className="font-semibold" style={{ color: "#292524" }}>Lansări Noi — România</h3>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
                  {data.albums.map((a: any, i: number) => (
                    <a key={a.id} href={a.permalink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-4 px-5 py-3 transition-colors block"
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                      <span className="w-6 text-xs font-bold text-center flex-shrink-0" style={{ color: i < 3 ? SpotifyGreen : "#C4AA8A" }}>
                        {i + 1}
                      </span>
                      {a.thumbnail
                        ? <img src={a.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        : <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: "rgba(29,185,84,0.1)" }}><Disc className="w-5 h-5" style={{ color: SpotifyGreen }} /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#292524" }}>{a.name}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: "#A8967E" }}>{a.artist}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: "rgba(29,185,84,0.1)", color: SpotifyGreen }}>
                          {a.type}
                        </span>
                        <p className="text-xs mt-1" style={{ color: "#C4AA8A" }}>{a.releaseDate}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
