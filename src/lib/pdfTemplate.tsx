import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Font, Link,
} from "@react-pdf/renderer";

const amber = "#D97706";
const dark = "#1C1814";
const muted = "#78614E";
const light = "#FFF8F0";
const border = "#F5D7A0";
const green = "#16a34a";
const red = "#dc2626";

const styles = StyleSheet.create({
  page: { backgroundColor: light, paddingTop: 50, paddingBottom: 50, paddingHorizontal: 50, fontFamily: "Helvetica" },
  coverPage: { backgroundColor: dark, paddingTop: 80, paddingBottom: 60, paddingHorizontal: 50, fontFamily: "Helvetica", flexDirection: "column", justifyContent: "space-between" },

  // Cover
  badge: { backgroundColor: amber, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 40 },
  badgeText: { color: dark, fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  coverTitle: { color: light, fontSize: 32, fontFamily: "Helvetica-Bold", lineHeight: 1.25, marginBottom: 12 },
  coverSubtitle: { color: "#C4AA8A", fontSize: 13, lineHeight: 1.6, marginBottom: 40 },
  coverName: { color: amber, fontSize: 18, fontFamily: "Helvetica-Bold" },
  coverFooter: { borderTopWidth: 1, borderTopColor: "rgba(245,215,160,0.2)", paddingTop: 20, flexDirection: "row", justifyContent: "space-between" },
  coverFooterText: { color: "#78614E", fontSize: 9 },

  // Section headers
  sectionHeader: { backgroundColor: dark, borderRadius: 6, padding: 14, marginBottom: 14, flexDirection: "row", alignItems: "center" },
  sectionNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: amber, alignItems: "center", justifyContent: "center", marginRight: 10 },
  sectionNumberText: { color: dark, fontSize: 11, fontFamily: "Helvetica-Bold" },
  sectionTitle: { color: light, fontSize: 14, fontFamily: "Helvetica-Bold", flex: 1 },
  sectionPlatform: { color: "#C4AA8A", fontSize: 9 },

  // Content
  intro: { fontSize: 10, color: muted, lineHeight: 1.7, marginBottom: 16 },
  stepBox: { borderWidth: 1, borderColor: border, borderRadius: 6, marginBottom: 10, overflow: "hidden" },
  stepHeader: { backgroundColor: "rgba(245,215,160,0.15)", paddingHorizontal: 12, paddingVertical: 7, flexDirection: "row", alignItems: "center" },
  stepNum: { width: 18, height: 18, borderRadius: 9, backgroundColor: amber, alignItems: "center", justifyContent: "center", marginRight: 8 },
  stepNumText: { color: dark, fontSize: 8, fontFamily: "Helvetica-Bold" },
  stepTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: dark, flex: 1 },
  stepBody: { paddingHorizontal: 12, paddingVertical: 8 },
  stepText: { fontSize: 9.5, color: "#5C4A35", lineHeight: 1.65 },
  codeBox: { backgroundColor: dark, borderRadius: 4, padding: 8, marginTop: 6 },
  codeText: { color: amber, fontSize: 9, fontFamily: "Helvetica" },
  warningBox: { backgroundColor: "rgba(220,38,38,0.07)", borderWidth: 1, borderColor: "rgba(220,38,38,0.2)", borderRadius: 5, padding: 10, marginTop: 8 },
  warningText: { fontSize: 9, color: red, lineHeight: 1.6 },
  tipBox: { backgroundColor: "rgba(22,163,74,0.07)", borderWidth: 1, borderColor: "rgba(22,163,74,0.2)", borderRadius: 5, padding: 10, marginTop: 8 },
  tipText: { fontSize: 9, color: green, lineHeight: 1.6 },
  urlBox: { backgroundColor: "rgba(245,215,160,0.12)", borderRadius: 4, padding: 7, marginTop: 6 },
  urlText: { color: amber, fontSize: 9, fontFamily: "Helvetica-Bold" },

  // TOC
  tocItem: { flexDirection: "row", alignItems: "center", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "rgba(245,215,160,0.2)" },
  tocNum: { width: 20, height: 20, borderRadius: 3, backgroundColor: amber, alignItems: "center", justifyContent: "center", marginRight: 10 },
  tocNumText: { color: dark, fontSize: 9, fontFamily: "Helvetica-Bold" },
  tocTitle: { fontSize: 10, color: dark, flex: 1 },
  tocSub: { fontSize: 9, color: muted },

  pageFooter: { position: "absolute", bottom: 25, left: 50, right: 50, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: border, paddingTop: 8 },
  pageFooterText: { fontSize: 8, color: "#C4AA8A" },
});

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.stepBox}>
      <View style={styles.stepHeader}>
        <View style={styles.stepNum}><Text style={styles.stepNumText}>{n}</Text></View>
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
      <View style={styles.stepBody}>{children}</View>
    </View>
  );
}

function Url({ url }: { url: string }) {
  return <View style={styles.urlBox}><Text style={styles.urlText}>🔗 {url}</Text></View>;
}

function Warning({ children }: { children: string }) {
  return <View style={styles.warningBox}><Text style={styles.warningText}>⚠ {children}</Text></View>;
}

function Tip({ children }: { children: string }) {
  return <View style={styles.tipBox}><Text style={styles.tipText}>✓ {children}</Text></View>;
}

function PageFooter({ name }: { name: string }) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text style={styles.pageFooterText}>MarketHub Pro — Personalized Setup Guide for {name}</Text>
      <Text style={styles.pageFooterText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export function WelcomePDF({ name, email, plan, date }: { name: string; email: string; plan: string; date: string }) {
  return (
    <Document title={`MarketHub Pro Setup Guide — ${name}`} author="MarketHub Pro" language="en">

      {/* ═══ COVER PAGE ═══ */}
      <Page size="A4" style={styles.coverPage}>
        <View>
          <View style={styles.badge}><Text style={styles.badgeText}>MARKETHUB PRO · SETUP GUIDE</Text></View>
          <Text style={styles.coverTitle}>Your Complete{"\n"}Setup Guide</Text>
          <Text style={styles.coverSubtitle}>
            Everything you need to activate real data in your MarketHub Pro platform —
            step-by-step instructions for each API, clear explanations and direct links.
          </Text>
          <Text style={{ color: "#C4AA8A", fontSize: 11, marginBottom: 4 }}>Prepared for:</Text>
          <Text style={styles.coverName}>{name}</Text>
          <Text style={{ color: "#A8967E", fontSize: 10, marginTop: 4 }}>{email}</Text>
          <View style={{ marginTop: 16, flexDirection: "row", gap: 16 }}>
            <View style={{ backgroundColor: "rgba(245,215,160,0.1)", borderRadius: 6, padding: 10, flex: 1 }}>
              <Text style={{ color: "#C4AA8A", fontSize: 8 }}>ACTIVE PLAN</Text>
              <Text style={{ color: amber, fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 }}>{plan}</Text>
            </View>
            <View style={{ backgroundColor: "rgba(245,215,160,0.1)", borderRadius: 6, padding: 10, flex: 1 }}>
              <Text style={{ color: "#C4AA8A", fontSize: 8 }}>ISSUED ON</Text>
              <Text style={{ color: light, fontSize: 12, marginTop: 2 }}>{date}</Text>
            </View>
          </View>
        </View>
        <View style={styles.coverFooter}>
          <Text style={styles.coverFooterText}>markethubpromo.com</Text>
          <Text style={styles.coverFooterText}>Confidential · Personal Use</Text>
          <Text style={styles.coverFooterText}>© MarketHub Pro {new Date().getFullYear()}</Text>
        </View>
      </Page>

      {/* ═══ TABLE OF CONTENTS ═══ */}
      <Page size="A4" style={styles.page}>
        <Text style={{ fontSize: 20, fontFamily: "Helvetica-Bold", color: dark, marginBottom: 6 }}>Table of Contents</Text>
        <Text style={{ fontSize: 10, color: muted, marginBottom: 24 }}>This guide covers setup instructions for 4 API platforms</Text>

        {[
          { n: 1, title: "YouTube Data API", sub: "Trending, channels, videos, own channel analytics" },
          { n: 2, title: "Instagram & Facebook", sub: "Own account analytics, reach, impressions" },
          { n: 3, title: "News API", sub: "Real-time news and Creator Economy" },
          { n: 4, title: "Final Configuration", sub: "Verify settings, troubleshooting, support" },
        ].map(item => (
          <View key={item.n} style={styles.tocItem}>
            <View style={styles.tocNum}><Text style={styles.tocNumText}>{item.n}</Text></View>
            <Text style={styles.tocTitle}>{item.title}</Text>
            <Text style={styles.tocSub}>{item.sub}</Text>
          </View>
        ))}

        <View style={{ marginTop: 30, backgroundColor: "rgba(245,215,160,0.1)", borderRadius: 8, padding: 16, borderWidth: 1, borderColor: border }}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: dark, marginBottom: 8 }}>Estimated setup time</Text>
          <Text style={{ fontSize: 10, color: muted, lineHeight: 1.7 }}>
            YouTube API: ~10 minutes{"\n"}
            Instagram/Facebook: ~15 minutes (requires Business account){"\n"}
            News API: ~2 minutes{"\n"}
            {"  "}────────────────{"\n"}
            Total: approximately 27-30 minutes
          </Text>
        </View>
        <PageFooter name={name} />
      </Page>

      {/* ═══ SECTION 1: YOUTUBE ═══ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>1</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>YouTube Data API v3</Text>
            <Text style={styles.sectionPlatform}>Google Cloud Console</Text>
          </View>
        </View>
        <Text style={styles.intro}>
          YouTube API gives you access to real data: trending videos from any country, own channel stats,
          channel search, video analytics. Free up to 10,000 units/day (sufficient for normal use).
        </Text>

        <Step n={1} title="Create a Google account (if you don't have one)">
          <Text style={styles.stepText}>You need an active Google account. If you have Gmail, that's enough.</Text>
          <Url url="https://accounts.google.com" />
        </Step>
        <Step n={2} title="Open Google Cloud Console">
          <Text style={styles.stepText}>
            Open Google Cloud Console and accept the terms of service on first access.
          </Text>
          <Url url="https://console.cloud.google.com" />
        </Step>
        <Step n={3} title="Create a new project">
          <Text style={styles.stepText}>
            Click the project selector at the top → "NEW PROJECT"{"\n"}
            • Project name: MarketHub Pro (or any name){"\n"}
            • Click "CREATE" and wait ~10 seconds
          </Text>
        </Step>
        <Step n={4} title="Enable YouTube Data API v3">
          <Text style={styles.stepText}>
            Left menu → "APIs & Services" → "Library"{"\n"}
            Search: YouTube Data API v3{"\n"}
            Click the result → blue "ENABLE" button
          </Text>
          <Tip>Make sure you are in the correct project (check the top bar)</Tip>
        </Step>
        <Step n={5} title="Generate API Key">
          <Text style={styles.stepText}>
            Left menu → "APIs & Services" → "Credentials"{"\n"}
            Click "+ CREATE CREDENTIALS" → "API key"{"\n"}
            A key is automatically generated in the format: AIzaSy...{"\n"}
            Click "COPY" or write it down
          </Text>
          <Warning>Never share your API key with anyone! Treat it like a password.</Warning>
        </Step>
        <Step n={6} title="Paste into MarketHub Pro Settings">
          <Text style={styles.stepText}>
            Go to markethubpromo.com → Settings (left menu, bottom){"\n"}
            "YouTube API Key" field → paste your key{"\n"}
            Click "Save" → a green confirmation message appears{"\n"}
            {"\n"}
            Optional: also add "YouTube Channel ID" for the "My Channel" page{"\n"}
            Channel ID format: UCxxxxxxxxxxxxxxxxxxxxxxx{"\n"}
            Find it on YouTube → your account → About → Share → Copy channel ID
          </Text>
        </Step>
        <PageFooter name={name} />
      </Page>

      {/* ═══ SECTION 2: INSTAGRAM & FACEBOOK ═══ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>2</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Instagram & Facebook API</Text>
            <Text style={styles.sectionPlatform}>Meta for Developers</Text>
          </View>
        </View>
        <Text style={styles.intro}>
          Meta API gives access to your Instagram account and Facebook page analytics: followers,
          reach, impressions, engagement. Requires a Business/Creator account and a Facebook page linked to Instagram.
        </Text>

        <Step n={1} title="Switch to Instagram Business account">
          <Text style={styles.stepText}>
            In Instagram → Profile → Edit Profile → Account type{"\n"}
            Switch to "Professional Account" → "Business" or "Creator"{"\n"}
            Connect a Facebook page (required for API access)
          </Text>
          <Warning>Personal Instagram accounts are not supported by the API. You must use a Business/Creator account.</Warning>
        </Step>
        <Step n={2} title="Create an app on Meta for Developers">
          <Text style={styles.stepText}>
            Log in with your Facebook account at:{"\n"}
          </Text>
          <Url url="https://developers.facebook.com" />
          <Text style={{ ...styles.stepText, marginTop: 6 }}>
            Click "My Apps" → "Create App"{"\n"}
            Choose type: "Business" → Next{"\n"}
            App name: MarketHub Pro → Create App
          </Text>
        </Step>
        <Step n={3} title="Add Instagram Graph API">
          <Text style={styles.stepText}>
            In your app dashboard → "+ Add Product"{"\n"}
            Find "Instagram Graph API" → "Set Up"{"\n"}
            Follow the basic configuration steps
          </Text>
        </Step>
        <Step n={4} title="Generate Access Token">
          <Text style={styles.stepText}>
            Tools → Graph API Explorer{"\n"}
            Select your app from the dropdown{"\n"}
            Click "Generate Access Token" → authorize{"\n"}
            Copy the generated token (starts with "EAA...")
          </Text>
          <Warning>Expired tokens cause errors. If you see a 404 error in the platform, regenerate the token.</Warning>
        </Step>
        <Step n={5} title="Connect in MarketHub Pro">
          <Text style={styles.stepText}>
            Go to markethubpromo.com → Settings{"\n"}
            Instagram section → click "Connect Instagram"{"\n"}
            Or paste the Access Token manually in the dedicated field{"\n"}
            Click "Save"
          </Text>
          <Tip>After connecting, Instagram data appears on the Overview and My Channel pages</Tip>
        </Step>
        <PageFooter name={name} />
      </Page>

      {/* ═══ SECTION 3: NEWS API ═══ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>3</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>News API</Text>
            <Text style={styles.sectionPlatform}>newsapi.org</Text>
          </View>
        </View>
        <Text style={styles.intro}>
          News API provides real-time news from around the world. In MarketHub Pro you'll see
          Top Headlines and Creator Economy news (YouTube, TikTok, Instagram). Free plan:
          100 requests/day, sufficient for normal use.
        </Text>

        <Step n={1} title="Create an account on NewsAPI.org">
          <Text style={styles.stepText}>Free registration, no credit card required.</Text>
          <Url url="https://newsapi.org/register" />
        </Step>
        <Step n={2} title="Copy your API Key">
          <Text style={styles.stepText}>
            After registration and email confirmation:{"\n"}
            Go to newsapi.org/account{"\n"}
            "Your API key" section → copy the key (32 characters)
          </Text>
        </Step>
        <Step n={3} title="Add to MarketHub Pro Settings">
          <Text style={styles.stepText}>
            markethubpromo.com → Settings{"\n"}
            "News API Key" field → paste your key{"\n"}
            Click "Save"
          </Text>
          <Tip>The News page will immediately display real news and Creator Economy stories</Tip>
        </Step>
        <View style={{ marginTop: 10, padding: 14, backgroundColor: "rgba(245,215,160,0.1)", borderRadius: 6, borderWidth: 1, borderColor: border }}>
          <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: dark, marginBottom: 6 }}>Free Plan Limits</Text>
          <Text style={{ fontSize: 9.5, color: muted, lineHeight: 1.65 }}>
            • 100 requests/day (MarketHub Pro caches for 30min so uses very few requests){"\n"}
            • News up to 1 month old{"\n"}
            • No advanced filtering{"\n"}
            Developer plan ($449/month): no limits, real-time data{"\n"}
            For normal use, the free plan is sufficient.
          </Text>
        </View>
        <PageFooter name={name} />
      </Page>

      {/* ═══ SECTION 4: FINAL CONFIG ═══ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>4</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Final Configuration & Troubleshooting</Text>
            <Text style={styles.sectionPlatform}>Verification + Common Issues</Text>
          </View>
        </View>

        <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: dark, marginBottom: 10 }}>Final Checklist</Text>
        {[
          "YouTube API Key added in Settings → trending appears on the Trending and Global pages",
          "YouTube Channel ID added → My Channel page displays your channel data",
          "Instagram connected → data appears on Overview (followers, reach, impressions)",
          "News API Key → News page displays real-time news and Creator Economy stories",
        ].map((item, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 7 }}>
            <View style={{ width: 16, height: 16, borderRadius: 3, borderWidth: 1.5, borderColor: amber, marginRight: 10, marginTop: 1 }} />
            <Text style={{ fontSize: 9.5, color: dark, flex: 1, lineHeight: 1.5 }}>{item}</Text>
          </View>
        ))}

        <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: dark, marginTop: 20, marginBottom: 10 }}>Common Issues</Text>
        {[
          { prob: "Error: API key not configured", sol: "Go to Settings and save the key again. Make sure there are no trailing spaces." },
          { prob: "YouTube: quota exceeded", sol: "You've used the 10,000 free daily units. Wait until tomorrow or create a new project." },
          { prob: "Instagram 404 / token expired", sol: "Meta tokens expire periodically. Go to Settings → reconnect Instagram." },
          { prob: "News: connection error", sol: "Check your News API key. The free plan allows only 100 requests/day." },
        ].map((item, i) => (
          <View key={i} style={{ marginBottom: 8, borderWidth: 1, borderColor: border, borderRadius: 5, overflow: "hidden" }}>
            <View style={{ backgroundColor: "rgba(245,215,160,0.12)", padding: 8 }}>
              <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: red }}>✕ {item.prob}</Text>
            </View>
            <View style={{ padding: 8 }}>
              <Text style={{ fontSize: 9.5, color: green }}>→ {item.sol}</Text>
            </View>
          </View>
        ))}

        <View style={{ marginTop: 20, backgroundColor: dark, borderRadius: 8, padding: 16 }}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: amber, marginBottom: 8 }}>Need help?</Text>
          <Text style={{ fontSize: 9.5, color: "#C4AA8A", lineHeight: 1.7 }}>
            In the platform → click the "Setup Agent" button (bottom right corner){"\n"}
            The AI agent will guide you interactively through any configuration.{"\n"}
            {"\n"}
            Support email: support@markethubpromo.com{"\n"}
            Website: markethubpromo.com{"\n"}
            {"\n"}
            Welcome, {name}! Good luck with MarketHub Pro 🎯
          </Text>
        </View>
        <PageFooter name={name} />
      </Page>

    </Document>
  );
}
