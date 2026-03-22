"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/layout/Header";
import { formatNumber } from "@/lib/utils";
import { Music, PlayCircle, Disc, Search, Users, TrendingUp, ChevronRight, Globe, Download } from "lucide-react";
import { exportCSV, exportJSON } from "@/lib/utils";

const G = "#1DB954";
const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };

const SPOTIFY_COUNTRIES: { code: string; name: string; flag: string; continent: string }[] = [
  { code: "RO", name: "România", flag: "🇷🇴", continent: "Europa" },
  { code: "GB", name: "UK", flag: "🇬🇧", continent: "Europa" },
  { code: "DE", name: "Germania", flag: "🇩🇪", continent: "Europa" },
  { code: "FR", name: "Franța", flag: "🇫🇷", continent: "Europa" },
  { code: "IT", name: "Italia", flag: "🇮🇹", continent: "Europa" },
  { code: "ES", name: "Spania", flag: "🇪🇸", continent: "Europa" },
  { code: "NL", name: "Olanda", flag: "🇳🇱", continent: "Europa" },
  { code: "PL", name: "Polonia", flag: "🇵🇱", continent: "Europa" },
  { code: "SE", name: "Suedia", flag: "🇸🇪", continent: "Europa" },
  { code: "NO", name: "Norvegia", flag: "🇳🇴", continent: "Europa" },
  { code: "PT", name: "Portugalia", flag: "🇵🇹", continent: "Europa" },
  { code: "US", name: "SUA", flag: "🇺🇸", continent: "Americas" },
  { code: "CA", name: "Canada", flag: "🇨🇦", continent: "Americas" },
  { code: "BR", name: "Brazilia", flag: "🇧🇷", continent: "Americas" },
  { code: "MX", name: "Mexic", flag: "🇲🇽", continent: "Americas" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", continent: "Americas" },
  { code: "CO", name: "Columbia", flag: "🇨🇴", continent: "Americas" },
  { code: "CL", name: "Chile", flag: "🇨🇱", continent: "Americas" },
  { code: "JP", name: "Japonia", flag: "🇯🇵", continent: "Asia" },
  { code: "KR", name: "Coreea de Sud", flag: "🇰🇷", continent: "Asia" },
  { code: "IN", name: "India", flag: "🇮🇳", continent: "Asia" },
  { code: "PH", name: "Filipine", flag: "🇵🇭", continent: "Asia" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", continent: "Asia" },
  { code: "ID", name: "Indonezia", flag: "🇮🇩", continent: "Asia" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", continent: "Asia" },
  { code: "AU", name: "Australia", flag: "🇦🇺", continent: "Oceania" },
  { code: "NZ", name: "Noua Zeelandă", flag: "🇳🇿", continent: "Oceania" },
  { code: "TR", name: "Turcia", flag: "🇹🇷", continent: "M.Orient" },
  { code: "SA", name: "Arabia Saudită", flag: "🇸🇦", continent: "M.Orient" },
  { code: "AE", name: "EAU", flag: "🇦🇪", continent: "M.Orient" },
  { code: "EG", name: "Egipt", flag: "🇪🇬", continent: "M.Orient" },
  { code: "ZA", name: "Africa de Sud", flag: "🇿🇦", continent: "Africa" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", continent: "Africa" },
];

const CONTINENTS = ["Toate", "Europa", "Americas", "Asia", "M.Orient", "Africa", "Oceania"];

function PopularityBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(29,185,84,0.15)" }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: G }} />
      </div>
      <span className="text-xs w-6 text-right" style={{ color: "#A8967E" }}>{value}</span>
    </div>
  );
}

function msToMin(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function SpotifyPage() {
  const [tab, setTab] = useState<"charts" | "artist">("charts");
  const [continent, setContinent] = useState("Toate");
  const [selectedCountry, setSelectedCountry] = useState(SPOTIFY_COUNTRIES[0]);
  const [chartsData, setChartsData] = useState<any>(null);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [chartsCache, setChartsCache] = useState<Record<string, any>>({});
  const [activePlaylist, setActivePlaylist] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Artist search
  const [artistQuery, setArtistQuery] = useState("");
  const [artistData, setArtistData] = useState<any>(null);
  const [artistLoading, setArtistLoading] = useState(false);
  const [artistError, setArtistError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCharts = useCallback((code: string) => {
    if (chartsCache[code]) { setChartsData(chartsCache[code]); return; }
    setChartsLoading(true);
    fetch(`/api/spotify/charts?country=${code}`)
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setChartsData(d);
          setChartsCache(prev => ({ ...prev, [code]: d }));
          setActivePlaylist(0);
        }
      })
      .finally(() => setChartsLoading(false));
  }, [chartsCache]);

  useEffect(() => { loadCharts(selectedCountry.code); }, [selectedCountry.code]);

  const handlePreview = (url: string | null) => {
    if (!url) return;
    if (previewUrl === url) {
      audioRef.current?.pause();
      setPreviewUrl(null);
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = url; audioRef.current.play(); }
    else { const a = new Audio(url); a.play(); audioRef.current = a; }
    setPreviewUrl(url);
  };

  const searchArtist = () => {
    if (artistQuery.trim().length < 2) return;
    setArtistLoading(true);
    setArtistError("");
    fetch(`/api/spotify/artist?q=${encodeURIComponent(artistQuery)}`)
      .then(r => r.json())
      .then(d => { if (d.error) setArtistError(d.error); else setArtistData(d); })
      .finally(() => setArtistLoading(false));
  };

  const filteredCountries = continent === "Toate"
    ? SPOTIFY_COUNTRIES
    : SPOTIFY_COUNTRIES.filter(c => c.continent === continent);

  const currentPlaylist = chartsData?.charts?.[activePlaylist];

  return (
    <div>
      <Header title="Spotify Charts" subtitle="Top 50 · Viral · Featured — date reale per tara" />
      <div className="p-6 space-y-5">

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: "rgba(245,215,160,0.1)", border: "1px solid rgba(245,215,160,0.25)" }}>
          {([["charts", "🌍 Charts Globale"], ["artist", "🎤 Artist Search"]] as const).map(([t, label]) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className="px-5 py-2 text-sm font-semibold rounded-lg transition-all"
              style={tab === t ? { backgroundColor: G, color: "white" } : { color: "#78614E" }}>
              {label}
            </button>
          ))}
        </div>

        {/* ─── CHARTS TAB ─── */}
        {tab === "charts" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Country Selector */}
            <div className="rounded-xl overflow-hidden" style={cardStyle}>
              <div className="p-3" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                <div className="flex flex-wrap gap-1">
                  {CONTINENTS.map(c => (
                    <button key={c} type="button" onClick={() => setContinent(c)}
                      className="px-2 py-1 text-xs font-medium rounded-md"
                      style={continent === c ? { backgroundColor: G, color: "white" } : { color: "#78614E", backgroundColor: "rgba(29,185,84,0.07)" }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: "520px" }}>
                {filteredCountries.map(country => (
                  <button key={country.code} type="button"
                    onClick={() => setSelectedCountry(country)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={selectedCountry.code === country.code
                      ? { backgroundColor: "rgba(29,185,84,0.08)", borderLeft: "3px solid " + G }
                      : { borderLeft: "3px solid transparent" }}
                    onMouseEnter={e => { if (selectedCountry.code !== country.code) e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)"; }}
                    onMouseLeave={e => { if (selectedCountry.code !== country.code) e.currentTarget.style.backgroundColor = "transparent"; }}>
                    <span className="text-lg">{country.flag}</span>
                    <span className="text-sm font-medium flex-1" style={{ color: selectedCountry.code === country.code ? G : "#292524" }}>{country.name}</span>
                    <span className="text-xs font-mono" style={{ color: "#C4AA8A" }}>{country.code}</span>
                    {selectedCountry.code === country.code && <ChevronRight className="w-3.5 h-3.5" style={{ color: G }} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Charts Panel */}
            <div className="lg:col-span-2 space-y-4">
              {/* Featured Playlists banner */}
              {chartsData?.featured?.length > 0 && (
                <div className="rounded-xl p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <PlayCircle className="w-4 h-4" style={{ color: G }} />
                    <span className="text-sm font-semibold" style={{ color: "#292524" }}>Featured {selectedCountry.flag} {selectedCountry.name}</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {chartsData.featured.map((p: any) => (
                      <a key={p.id} href={p.permalink} target="_blank" rel="noopener noreferrer"
                        className="flex-shrink-0 w-28 group">
                        <div className="w-28 h-28 rounded-lg overflow-hidden mb-1.5">
                          {p.thumbnail
                            ? <img src={p.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            : <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "rgba(29,185,84,0.1)" }}><Music className="w-6 h-6" style={{ color: G }} /></div>}
                        </div>
                        <p className="text-xs font-semibold leading-tight line-clamp-2" style={{ color: "#292524" }}>{p.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{p.tracks} tracks</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Chart playlists tabs */}
              {chartsData?.charts?.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={cardStyle}>
                  {/* Playlist selector + export */}
                  <div className="flex items-center" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                    <div className="flex flex-1">
                      {chartsData.charts.map((pl: any, i: number) => (
                        <button key={pl.id} type="button" onClick={() => setActivePlaylist(i)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-3 text-xs font-semibold transition-colors"
                          style={activePlaylist === i
                            ? { backgroundColor: "rgba(29,185,84,0.08)", color: G, borderBottom: `2px solid ${G}` }
                            : { color: "#78614E" }}>
                          {i === 0 ? "🏆" : i === 1 ? "🔥" : "✨"}
                          <span className="truncate max-w-[80px]">{pl.name}</span>
                        </button>
                      ))}
                    </div>
                    {currentPlaylist?.tracks?.length > 0 && (
                      <div className="flex gap-1 px-3">
                        <button type="button" onClick={() => exportCSV(
                          `spotify-${selectedCountry.code}-${currentPlaylist.name.replace(/\s+/g, "-")}`,
                          ["#", "Track", "Artisti", "Album", "Popularitate", "Durata(s)", "URL"],
                          currentPlaylist.tracks.map((t: any, i: number) => [i + 1, t.name, t.artists, t.album, t.popularity, Math.round(t.duration / 1000), t.permalink])
                        )} className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-semibold"
                          style={{ backgroundColor: "rgba(29,185,84,0.1)", color: G }}>
                          <Download className="w-3 h-3" />CSV
                        </button>
                        <button type="button" onClick={() => exportJSON(
                          `spotify-${selectedCountry.code}-${currentPlaylist.name.replace(/\s+/g, "-")}`,
                          { country: selectedCountry, playlist: currentPlaylist.name, exportedAt: new Date().toISOString(), tracks: currentPlaylist.tracks }
                        )} className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-semibold"
                          style={{ backgroundColor: "rgba(29,185,84,0.1)", color: G }}>
                          <Download className="w-3 h-3" />JSON
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Track list */}
                  {chartsLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <p className="text-sm" style={{ color: "#C4AA8A" }}>Se incarca...</p>
                    </div>
                  ) : currentPlaylist && (
                    <div className="divide-y" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
                      {currentPlaylist.tracks.map((t: any, i: number) => (
                        <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)")}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                          <span className="w-5 text-xs font-bold text-center flex-shrink-0" style={{ color: i < 3 ? G : "#C4AA8A" }}>{i + 1}</span>
                          <img src={t.thumbnail} alt="" className="w-10 h-10 rounded flex-shrink-0 object-cover" />
                          <div className="flex-1 min-w-0">
                            <a href={t.permalink} target="_blank" rel="noopener noreferrer"
                              className="text-sm font-semibold hover:underline truncate block" style={{ color: "#292524" }}>{t.name}</a>
                            <p className="text-xs truncate" style={{ color: "#A8967E" }}>{t.artists}</p>
                            <PopularityBar value={t.popularity} />
                          </div>
                          <span className="text-xs flex-shrink-0" style={{ color: "#C4AA8A" }}>{msToMin(t.duration)}</span>
                          {t.preview && (
                            <button type="button" onClick={() => handlePreview(t.preview)}
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                              style={previewUrl === t.preview
                                ? { backgroundColor: G, color: "white" }
                                : { backgroundColor: "rgba(29,185,84,0.1)", color: G }}
                              title="Preview 30s">
                              {previewUrl === t.preview ? "⏸" : "▶"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!chartsLoading && !chartsData && (
                <div className="rounded-xl p-8 text-center" style={cardStyle}>
                  <p className="text-sm" style={{ color: "#C4AA8A" }}>Selecteaza o tara din stanga</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ARTIST SEARCH TAB ─── */}
        {tab === "artist" && (
          <div className="space-y-5">
            {/* Search */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: G }} />
                <input
                  type="text"
                  placeholder="Cauta artist (ex: Smiley, Doja Cat, Bad Bunny...)"
                  value={artistQuery}
                  onChange={e => setArtistQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchArtist()}
                  className="w-full pl-9 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                  style={{ border: "1px solid rgba(29,185,84,0.3)", backgroundColor: "#FFFCF7", color: "#292524" }}
                />
              </div>
              <button type="button" onClick={searchArtist}
                className="px-6 py-3 rounded-xl text-sm font-bold transition-colors"
                style={{ backgroundColor: G, color: "white" }}>
                {artistLoading ? "..." : "Cauta"}
              </button>
            </div>

            {artistError && (
              <div className="rounded-xl p-4" style={cardStyle}>
                <p className="text-sm" style={{ color: "#dc2626" }}>{artistError}</p>
              </div>
            )}

            {artistData && (
              <div className="space-y-5">
                {/* Artist Header */}
                <div className="rounded-xl p-5" style={cardStyle}>
                  <div className="flex items-start gap-5">
                    {artistData.artist.thumbnail && (
                      <img src={artistData.artist.thumbnail} alt="" className="w-24 h-24 rounded-full object-cover flex-shrink-0"
                        style={{ border: `3px solid ${G}` }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <a href={artistData.artist.permalink} target="_blank" rel="noopener noreferrer"
                          className="text-2xl font-bold hover:underline" style={{ color: "#292524" }}>
                          {artistData.artist.name}
                        </a>
                        <button type="button" onClick={() => exportCSV(
                          `spotify-artist-${artistData.artist.name.replace(/\s+/g, "-")}`,
                          ["#", "Track", "Album", "Popularitate", "Durata(s)", "URL"],
                          artistData.topTracks.map((t: any, i: number) => [i + 1, t.name, t.album, t.popularity, Math.round(t.duration / 1000), t.permalink])
                        )} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{ backgroundColor: "rgba(29,185,84,0.1)", color: G }}>
                          <Download className="w-3 h-3" />CSV Top Tracks
                        </button>
                        <button type="button" onClick={() => exportJSON(
                          `spotify-artist-${artistData.artist.name.replace(/\s+/g, "-")}`, artistData
                        )} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{ backgroundColor: "rgba(29,185,84,0.1)", color: G }}>
                          <Download className="w-3 h-3" />JSON Complet
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {artistData.artist.genres?.slice(0, 4).map((g: string) => (
                          <span key={g} className="text-xs px-2 py-0.5 rounded-full capitalize"
                            style={{ backgroundColor: "rgba(29,185,84,0.1)", color: G }}>{g}</span>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(29,185,84,0.06)" }}>
                          <p className="text-xs" style={{ color: "#A8967E" }}>Followers Spotify</p>
                          <p className="text-xl font-bold" style={{ color: "#292524" }}>{formatNumber(artistData.artist.followers)}</p>
                        </div>
                        <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(29,185,84,0.06)" }}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs" style={{ color: "#A8967E" }}>Popularitate</p>
                            <span className="text-xs font-bold" style={{ color: G }}>{artistData.artist.popularity}/100</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(29,185,84,0.15)" }}>
                            <div className="h-full rounded-full" style={{ width: `${artistData.artist.popularity}%`, backgroundColor: G }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Top Tracks */}
                  <div className="rounded-xl overflow-hidden" style={cardStyle}>
                    <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                      <TrendingUp className="w-4 h-4" style={{ color: G }} />
                      <h3 className="font-semibold" style={{ color: "#292524" }}>Top Tracks — Global</h3>
                    </div>
                    <div className="divide-y" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
                      {artistData.topTracks.map((t: any, i: number) => (
                        <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)")}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                          <span className="w-5 text-xs font-bold flex-shrink-0 text-center" style={{ color: i < 3 ? G : "#C4AA8A" }}>{i + 1}</span>
                          <img src={t.thumbnail} alt="" className="w-9 h-9 rounded flex-shrink-0 object-cover" />
                          <div className="flex-1 min-w-0">
                            <a href={t.permalink} target="_blank" rel="noopener noreferrer"
                              className="text-sm font-semibold hover:underline truncate block" style={{ color: "#292524" }}>{t.name}</a>
                            <PopularityBar value={t.popularity} />
                          </div>
                          <span className="text-xs flex-shrink-0" style={{ color: "#C4AA8A" }}>{msToMin(t.duration)}</span>
                          {t.preview && (
                            <button type="button" onClick={() => handlePreview(t.preview)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                              style={previewUrl === t.preview
                                ? { backgroundColor: G, color: "white" }
                                : { backgroundColor: "rgba(29,185,84,0.1)", color: G }}>
                              {previewUrl === t.preview ? "⏸" : "▶"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Albums */}
                  <div className="space-y-4">
                    <div className="rounded-xl overflow-hidden" style={cardStyle}>
                      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                        <Disc className="w-4 h-4" style={{ color: G }} />
                        <h3 className="font-semibold" style={{ color: "#292524" }}>Discografie</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-3 p-4">
                        {artistData.albums.map((a: any) => (
                          <a key={a.id} href={a.permalink} target="_blank" rel="noopener noreferrer" className="group">
                            <div className="aspect-square rounded-lg overflow-hidden mb-1">
                              {a.thumbnail
                                ? <img src={a.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                : <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "rgba(29,185,84,0.1)" }}><Disc className="w-6 h-6" style={{ color: G }} /></div>}
                            </div>
                            <p className="text-xs font-semibold leading-tight line-clamp-1" style={{ color: "#292524" }}>{a.name}</p>
                            <p className="text-xs capitalize" style={{ color: "#A8967E" }}>{a.type} · {a.releaseDate?.slice(0, 4)}</p>
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Related Artists */}
                    {artistData.related?.length > 0 && (
                      <div className="rounded-xl p-4" style={cardStyle}>
                        <p className="text-sm font-semibold mb-3" style={{ color: "#292524" }}>Artisti similari</p>
                        <div className="grid grid-cols-3 gap-2">
                          {artistData.related.map((a: any) => (
                            <div key={a.id} className="flex flex-col items-center gap-1 p-2 rounded-lg text-center"
                              style={{ backgroundColor: "rgba(245,215,160,0.08)" }}>
                              {a.thumbnail
                                ? <img src={a.thumbnail} alt="" className="w-10 h-10 rounded-full object-cover" />
                                : <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(29,185,84,0.1)" }}><Users className="w-4 h-4" style={{ color: G }} /></div>}
                              <p className="text-xs font-semibold line-clamp-1" style={{ color: "#292524" }}>{a.name}</p>
                              <p className="text-xs" style={{ color: G }}>{a.popularity}/100</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!artistData && !artistLoading && !artistError && (
              <div className="rounded-xl p-12 text-center" style={cardStyle}>
                <Music className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(29,185,84,0.3)" }} />
                <p className="font-semibold" style={{ color: "#292524" }}>Cauta orice artist</p>
                <p className="text-sm mt-1" style={{ color: "#A8967E" }}>
                  Spotify followers, top tracks globale, discografie, preview audio 30s
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
