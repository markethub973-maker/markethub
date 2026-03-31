import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";

const dark = "#1C1814";
const muted = "#78614E";
const light = "#A8967E";
const amber = "#F5A623";
const pink = "#E1306C";
const purple = "#8B5CF6";
const green = "#1DB954";
const border = "rgba(245,215,160,0.3)";
const bg = "#FFFCF7";

const styles = StyleSheet.create({
  page: { backgroundColor: bg, padding: 40, fontFamily: "Helvetica" },
  coverPage: { backgroundColor: dark, padding: 50, fontFamily: "Helvetica", justifyContent: "space-between" },
  h1: { fontSize: 28, fontFamily: "Helvetica-Bold", color: amber, marginBottom: 6 },
  h2: { fontSize: 16, fontFamily: "Helvetica-Bold", color: dark, marginBottom: 10 },
  h3: { fontSize: 12, fontFamily: "Helvetica-Bold", color: dark, marginBottom: 6 },
  label: { fontSize: 9, color: light, marginBottom: 3 },
  value: { fontSize: 20, fontFamily: "Helvetica-Bold", color: dark },
  text: { fontSize: 10, color: muted, lineHeight: 1.6 },
  small: { fontSize: 8.5, color: light },
  card: { backgroundColor: "white", borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: border },
  row: { flexDirection: "row", gap: 10, marginBottom: 12 },
  kpiCard: { flex: 1, backgroundColor: "white", borderRadius: 8, padding: 14, borderWidth: 1, borderColor: border, alignItems: "center" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
  divider: { height: 1, backgroundColor: border, marginVertical: 14 },
  footer: { position: "absolute", bottom: 25, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: light },
  dot: { width: 8, height: 8, borderRadius: 4 },
  barBg: { height: 6, backgroundColor: "rgba(245,215,160,0.2)", borderRadius: 3, flex: 1 },
  barFill: { height: 6, borderRadius: 3 },
  postCard: { width: "31%", backgroundColor: "white", borderRadius: 6, borderWidth: 1, borderColor: border, overflow: "hidden", marginBottom: 8 },
});

function PageFooter({ client, period }: { client: string; period: string }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>MarketHub Pro — Marketing Report</Text>
      <Text style={styles.footerText}>{client} · {period}</Text>
      <Text style={styles.footerText}>markethubpromo.com</Text>
    </View>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={[styles.label, { textAlign: "center" }]}>{label}</Text>
      <Text style={[styles.value, { color, textAlign: "center", marginTop: 4 }]}>{value}</Text>
      {sub && <Text style={[styles.small, { textAlign: "center", marginTop: 3 }]}>{sub}</Text>}
    </View>
  );
}

function EngLabel({ rate }: { rate: number }) {
  const color = rate >= 5 ? green : rate >= 2 ? amber : rate >= 0.5 ? "#F59E0B" : "#EF4444";
  const label = rate >= 5 ? "Excellent" : rate >= 2 ? "Good" : rate >= 0.5 ? "Average" : "Low";
  return (
    <View style={[styles.badge, { backgroundColor: color + "18" }]}>
      <Text style={{ fontSize: 8, color, fontFamily: "Helvetica-Bold" }}>{rate.toFixed(2)}% — {label}</Text>
    </View>
  );
}

function fmtNum(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export interface MarketingReportData {
  clientName: string;
  period: string;
  generatedAt: string;
  instagram: {
    username: string;
    followers: number;
    mediaCount: number;
    biography?: string;
    profilePicture?: string;
  };
  facebook?: {
    name: string;
    followers: number;
  };
  reach30: number;
  impressions30: number;
  avgEngRate: number;
  topPosts: {
    caption?: string;
    thumbnail?: string;
    likes: number;
    comments: number;
    engRate: number;
    mediaType: string;
    date: string;
    permalink: string;
  }[];
  bestDays: { day: string; avg: number }[];
  contentMix: { name: string; value: number }[];
  recommendations: { title: string; text: string }[];
}

export function MarketingReportPDF({ data }: { data: MarketingReportData }) {
  const { clientName, period, generatedAt, instagram, facebook, reach30, impressions30, avgEngRate, topPosts, bestDays, contentMix, recommendations } = data;

  return (
    <Document>
      {/* ═══ COVER PAGE ═══ */}
      <Page size="A4" style={styles.coverPage}>
        <View>
          <Text style={{ fontSize: 11, color: amber, fontFamily: "Helvetica-Bold", letterSpacing: 2, marginBottom: 40 }}>MARKETHUB PRO</Text>
          <Text style={[styles.h1, { fontSize: 32, marginBottom: 8 }]}>Marketing Report</Text>
          <Text style={{ fontSize: 16, color: "#C4AA8A", marginBottom: 4 }}>{clientName}</Text>
          <Text style={{ fontSize: 13, color: "#7B6B5A", marginBottom: 40 }}>{period}</Text>

          <View style={{ flexDirection: "row", gap: 20, marginBottom: 40 }}>
            <View style={{ flex: 1, backgroundColor: "rgba(245,166,35,0.08)", borderRadius: 10, padding: 16, borderWidth: 1, borderColor: "rgba(245,166,35,0.2)" }}>
              <Text style={{ fontSize: 9, color: amber, fontFamily: "Helvetica-Bold", marginBottom: 6 }}>INSTAGRAM</Text>
              <Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold", color: "white", marginBottom: 2 }}>@{instagram.username}</Text>
              <Text style={{ fontSize: 11, color: "#C4AA8A" }}>{fmtNum(instagram.followers)} followers</Text>
            </View>
            {facebook && (
              <View style={{ flex: 1, backgroundColor: "rgba(24,119,242,0.08)", borderRadius: 10, padding: 16, borderWidth: 1, borderColor: "rgba(24,119,242,0.2)" }}>
                <Text style={{ fontSize: 9, color: "#60A5FA", fontFamily: "Helvetica-Bold", marginBottom: 6 }}>FACEBOOK</Text>
                <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: "white", marginBottom: 2 }}>{facebook.name}</Text>
                <Text style={{ fontSize: 11, color: "#C4AA8A" }}>{fmtNum(facebook.followers)} followers</Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            {[
              { label: "Reach 30d", value: fmtNum(reach30), color: pink },
              { label: "Impressions", value: fmtNum(impressions30), color: purple },
              { label: "Eng. Rate", value: avgEngRate.toFixed(2) + "%", color: avgEngRate >= 3 ? green : amber },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: s.color }}>{s.value}</Text>
                <Text style={{ fontSize: 8, color: "#7B6B5A", marginTop: 2 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text style={{ fontSize: 8, color: "#7B6B5A" }}>Generated on {generatedAt} · markethubpromo.com</Text>
        </View>
      </Page>

      {/* ═══ PAGE 2: KPIs + BEST DAYS + CONTENT MIX ═══ */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.h2, { marginBottom: 16 }]}>Overall Performance</Text>

        {/* KPI Row */}
        <View style={styles.row}>
          <KpiCard label="Instagram Followers" value={fmtNum(instagram.followers)} sub={`${instagram.mediaCount} total posts`} color={pink} />
          <KpiCard label="Reach 30d" value={fmtNum(reach30)} sub="unique people" color={amber} />
          <KpiCard label="Impressions 30d" value={fmtNum(impressions30)} sub="total views" color={purple} />
          <KpiCard label="Avg. Eng. Rate" value={avgEngRate.toFixed(2) + "%"} sub="per post" color={avgEngRate >= 3 ? green : amber} />
        </View>

        {instagram.biography && (
          <View style={[styles.card, { marginBottom: 16 }]}>
            <Text style={[styles.small, { marginBottom: 4 }]}>BIO</Text>
            <Text style={styles.text}>{instagram.biography}</Text>
          </View>
        )}

        <View style={styles.row}>
          {/* Best Days */}
          <View style={[styles.card, { flex: 1, marginBottom: 0 }]}>
            <Text style={styles.h3}>Best posting days</Text>
            {bestDays.slice(0, 5).map((d, i) => (
              <View key={d.day} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: i === 0 ? pink : light, width: 16, textAlign: "right" }}>{i + 1}</Text>
                <Text style={{ fontSize: 10, color: dark, width: 35 }}>{d.day}</Text>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${bestDays[0]?.avg > 0 ? (d.avg / bestDays[0].avg) * 100 : 0}%`, backgroundColor: pink }]} />
                </View>
                <Text style={{ fontSize: 9, color: light, width: 40, textAlign: "right" }}>{d.avg.toFixed(2)}%</Text>
              </View>
            ))}
          </View>

          {/* Content Mix */}
          <View style={[styles.card, { flex: 1, marginBottom: 0 }]}>
            <Text style={styles.h3}>Content Mix</Text>
            {contentMix.map((c, i) => {
              const colors = [pink, amber, purple];
              const total = contentMix.reduce((s, x) => s + x.value, 0);
              const pct = total > 0 ? Math.round((c.value / total) * 100) : 0;
              return (
                <View key={c.name} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <View style={[styles.dot, { backgroundColor: colors[i % colors.length] }]} />
                  <Text style={{ fontSize: 10, color: dark, flex: 1 }}>{c.name}</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colors[i % colors.length] }]} />
                  </View>
                  <Text style={{ fontSize: 9, color: light, width: 28, textAlign: "right" }}>{c.value} ({pct}%)</Text>
                </View>
              );
            })}
            <Text style={[styles.small, { marginTop: 8 }]}>
              {contentMix.find(c => c.name === "Video") ? "Videos generate higher reach." : "Add more video/reels for increased reach."}
            </Text>
          </View>
        </View>

        <PageFooter client={clientName} period={period} />
      </Page>

      {/* ═══ PAGE 3: TOP POSTS ═══ */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.h2, { marginBottom: 4 }]}>Top Posts</Text>
        <Text style={[styles.text, { marginBottom: 16 }]}>Best performing posts from the last 30 days, sorted by engagement.</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {topPosts.slice(0, 6).map((p, i) => (
            <View key={i} style={styles.postCard}>
              <View style={{ backgroundColor: "rgba(225,48,108,0.06)", padding: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: i < 3 ? pink : muted }}>#{i + 1}</Text>
                  <Text style={{ fontSize: 8, color: light }}>{p.mediaType === "VIDEO" ? "Video" : p.mediaType === "CAROUSEL_ALBUM" ? "Carousel" : "Photo"}</Text>
                </View>
                {p.caption && (
                  <Text style={{ fontSize: 9, color: muted, lineHeight: 1.4, marginBottom: 6 }}>
                    {p.caption.slice(0, 100)}{p.caption.length > 100 ? "..." : ""}
                  </Text>
                )}
              </View>
              <View style={{ padding: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 9, color: dark }}><Text style={{ fontFamily: "Helvetica-Bold", color: pink }}>♥ {fmtNum(p.likes)}</Text>  💬 {fmtNum(p.comments)}</Text>
                  <Text style={{ fontSize: 8, color: light }}>{p.date}</Text>
                </View>
                <EngLabel rate={p.engRate} />
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.divider, { marginTop: 8 }]} />

        {/* Summary table */}
        <Text style={[styles.h3, { marginBottom: 8 }]}>Posts Summary Table</Text>
        <View style={{ borderWidth: 1, borderColor: border, borderRadius: 6, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", backgroundColor: "rgba(245,215,160,0.12)", padding: 8 }}>
            {["#", "Type", "Likes", "Comments", "ER%", "Date"].map(h => (
              <Text key={h} style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: light, flex: h === "#" ? 0.3 : h === "Data" ? 1.5 : 1 }}>{h}</Text>
            ))}
          </View>
          {topPosts.slice(0, 8).map((p, i) => (
            <View key={i} style={{ flexDirection: "row", padding: 7, borderTopWidth: 1, borderColor: border }}>
              <Text style={{ fontSize: 8, color: i < 3 ? pink : light, flex: 0.3 }}>{i + 1}</Text>
              <Text style={{ fontSize: 8, color: muted, flex: 1 }}>{p.mediaType === "VIDEO" ? "Video" : p.mediaType === "CAROUSEL_ALBUM" ? "Carousel" : "Photo"}</Text>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: pink, flex: 1 }}>{fmtNum(p.likes)}</Text>
              <Text style={{ fontSize: 8, color: muted, flex: 1 }}>{fmtNum(p.comments)}</Text>
              <Text style={{ fontSize: 8, color: p.engRate >= 3 ? green : p.engRate >= 1 ? amber : light, flex: 1 }}>{p.engRate.toFixed(2)}%</Text>
              <Text style={{ fontSize: 8, color: light, flex: 1.5 }}>{p.date}</Text>
            </View>
          ))}
        </View>

        <PageFooter client={clientName} period={period} />
      </Page>

      {/* ═══ PAGE 4: RECOMMENDATIONS ═══ */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.h2, { marginBottom: 4 }]}>Recomandări & Strategie</Text>
        <Text style={[styles.text, { marginBottom: 16 }]}>
          Bazate pe datele din perioada {period}, pentru optimizarea campaniilor viitoare.
        </Text>

        {recommendations.map((r, i) => (
          <View key={i} style={[styles.card, { marginBottom: 10, borderLeftWidth: 3, borderLeftColor: [pink, amber, purple, green][i % 4] }]}>
            <Text style={[styles.h3, { color: [pink, amber, purple, green][i % 4], marginBottom: 6 }]}>{r.title}</Text>
            <Text style={styles.text}>{r.text}</Text>
          </View>
        ))}

        <View style={[styles.divider]} />

        {/* Footer CTA */}
        <View style={{ backgroundColor: dark, borderRadius: 10, padding: 20, alignItems: "center" }}>
          <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: amber, marginBottom: 6 }}>MarketHub Pro</Text>
          <Text style={{ fontSize: 10, color: "#C4AA8A", marginBottom: 4 }}>Analytics · Trends · Competitor Intelligence</Text>
          <Text style={{ fontSize: 9, color: "#7B6B5A" }}>markethubpromo.com</Text>
        </View>

        <PageFooter client={clientName} period={period} />
      </Page>
    </Document>
  );
}
