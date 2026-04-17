"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, MapPin, Globe2, AlertCircle, RefreshCw } from "lucide-react";
import GlassChart from "@/components/ui/GlassChart";

const cardStyle = { backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const MALE = "#1877F2";
const FEMALE = "#E1306C";
const UNKNOWN = "#A8967E";
const AGE_COLOR = "var(--color-primary)";

export default function DemographicsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/instagram/demographics")
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  const reload = () => {
    setLoading(true);
    setError("");
    fetch("/api/instagram/demographics")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div>
        <Header title="Demographics Audience" subtitle="Demographic analysis of your Instagram followers" />
        <div className="p-6">
          <div className="rounded-xl p-12 text-center" style={cardStyle}>
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm" style={{ color: "#A8967E" }}>Loading demographic data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Demographics Audience" subtitle="Demographic analysis of your Instagram followers" />
        <div className="p-6">
          <div className="rounded-xl p-5 flex items-start gap-3" style={cardStyle}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1" style={{ color: "#EF4444" }}>Failed to load data</p>
              <p className="text-sm" style={{ color: "#A8967E" }}>{error}</p>
              <p className="text-xs mt-2" style={{ color: "#C4AA8A" }}>
                Note: Demographic data requires an Instagram Business account with at least 100 followers.
              </p>
              <button onClick={reload} className="mt-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "var(--color-primary)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const genderPie = [
    { name: "Men", value: data.genderSplit.male, color: MALE },
    { name: "Women", value: data.genderSplit.female, color: FEMALE },
    ...(data.genderSplit.unknown > 0 ? [{ name: "Unknown", value: data.genderSplit.unknown, color: UNKNOWN }] : []),
  ];

  const topCountry = data.topCountries?.[0];
  const topCity = data.topCities?.[0];
  const maxCountry = data.topCountries?.[0]?.count || 1;
  const maxCity = data.topCities?.[0]?.count || 1;

  return (
    <div>
      <Header title="Demographics Audience" subtitle="Demographic analysis of your Instagram followers" />
      <div className="p-6 space-y-5">

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Followers", value: data.followers?.toLocaleString(), color: "var(--color-primary)", icon: <Users className="w-4 h-4" /> },
            { label: "% Men", value: `${data.genderSplit.male}%`, color: MALE, icon: null },
            { label: "% Women", value: `${data.genderSplit.female}%`, color: FEMALE, icon: null },
            { label: "Top Country", value: topCountry?.country || "—", color: "#10B981", icon: <Globe2 className="w-4 h-4" /> },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
              <div className="flex items-center gap-2 mb-1" style={{ color: s.color }}>
                {s.icon}
                <p className="text-xs">{s.label}</p>
              </div>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Gender + Age */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Gender pie */}
          <GlassChart title="Gender Distribution" subtitle="Follower gender breakdown">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={genderPie} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                  {genderPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </GlassChart>

          {/* Age brackets */}
          <GlassChart title="Age Distribution" subtitle="Follower age brackets">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.ageBrackets} margin={{ left: -20, right: 10 }}>
                <XAxis dataKey="age" tick={{ fontSize: 11, fill: "#A8967E" }} />
                <YAxis tick={{ fontSize: 11, fill: "#A8967E" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)", borderRadius: 8 }}
                  formatter={(v: any) => [`${v} people`]}
                />
                <Bar dataKey="count" fill={AGE_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassChart>
        </div>

        {/* Gender x Age heatmap */}
        {data.genderAge && (
          <div className="rounded-xl p-5" style={cardStyle}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text)" }}>Gender × Age - Detailed</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left pb-2 pr-4" style={{ color: "#A8967E" }}>Age</th>
                    <th className="pb-2 px-3 text-center" style={{ color: MALE }}>Men</th>
                    <th className="pb-2 px-3 text-center" style={{ color: FEMALE }}>Women</th>
                    <th className="pb-2 px-3 text-center" style={{ color: UNKNOWN }}>N/A</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ageBrackets.map((row: any) => {
                    const m = data.genderAge?.M?.[row.age] || 0;
                    const f = data.genderAge?.F?.[row.age] || 0;
                    const u = data.genderAge?.U?.[row.age] || 0;
                    return (
                      <tr key={row.age} className="border-t" style={{ borderColor: "rgba(245,215,160,0.15)" }}>
                        <td className="py-2 pr-4 font-semibold" style={{ color: "var(--color-text)" }}>{row.age}</td>
                        <td className="py-2 px-3 text-center" style={{ color: MALE }}>{m.toLocaleString()}</td>
                        <td className="py-2 px-3 text-center" style={{ color: FEMALE }}>{f.toLocaleString()}</td>
                        <td className="py-2 px-3 text-center" style={{ color: UNKNOWN }}>{u.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cities + Countries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Top Cities */}
          <div className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Top Cities</h3>
            </div>
            <div className="space-y-2.5">
              {data.topCities.map((c: any, i: number) => (
                <div key={c.city}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: "#78614E" }}>
                      <span className="font-semibold mr-1" style={{ color: "var(--color-text)" }}>#{i + 1}</span>{c.city}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "var(--color-primary)" }}>{c.count.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,215,160,0.2)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.round((c.count / maxCity) * 100)}%`, backgroundColor: "var(--color-primary)" }} />
                  </div>
                </div>
              ))}
              {data.topCities.length === 0 && <p className="text-xs" style={{ color: "#C4AA8A" }}>Insufficient data</p>}
            </div>
          </div>

          {/* Top Countries */}
          <div className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <Globe2 className="w-4 h-4" style={{ color: "#10B981" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Top Countries</h3>
            </div>
            <div className="space-y-2.5">
              {data.topCountries.map((c: any, i: number) => (
                <div key={c.country}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: "#78614E" }}>
                      <span className="font-semibold mr-1" style={{ color: "var(--color-text)" }}>#{i + 1}</span>{c.country}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "#10B981" }}>{c.count.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(16,185,129,0.1)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.round((c.count / maxCountry) * 100)}%`, backgroundColor: "#10B981" }} />
                  </div>
                </div>
              ))}
              {data.topCountries.length === 0 && <p className="text-xs" style={{ color: "#C4AA8A" }}>Insufficient data</p>}
            </div>
          </div>
        </div>

        <p className="text-xs text-center" style={{ color: "#C4AA8A" }}>
          Demographic data is updated daily by Instagram Business. Requires at least 100 followers to be available.
        </p>
      </div>
    </div>
  );
}
