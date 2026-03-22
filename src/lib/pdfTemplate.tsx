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
      <Text style={styles.pageFooterText}>MarketHub Pro — Ghid Setup Personalizat pentru {name}</Text>
      <Text style={styles.pageFooterText} render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export function WelcomePDF({ name, email, plan, date }: { name: string; email: string; plan: string; date: string }) {
  return (
    <Document title={`MarketHub Pro Setup Guide — ${name}`} author="MarketHub Pro" language="ro">

      {/* ═══ COVER PAGE ═══ */}
      <Page size="A4" style={styles.coverPage}>
        <View>
          <View style={styles.badge}><Text style={styles.badgeText}>VIRALSTAT · GHID PERSONALIZAT</Text></View>
          <Text style={styles.coverTitle}>Ghidul Tău Complet{"\n"}de Configurare</Text>
          <Text style={styles.coverSubtitle}>
            Tot ce ai nevoie pentru a activa datele reale în platforma ta MarketHub Pro —
            instrucțiuni pas cu pas pentru fiecare API, explicații clare și link-uri directe.
          </Text>
          <Text style={{ color: "#C4AA8A", fontSize: 11, marginBottom: 4 }}>Pregătit special pentru:</Text>
          <Text style={styles.coverName}>{name}</Text>
          <Text style={{ color: "#A8967E", fontSize: 10, marginTop: 4 }}>{email}</Text>
          <View style={{ marginTop: 16, flexDirection: "row", gap: 16 }}>
            <View style={{ backgroundColor: "rgba(245,215,160,0.1)", borderRadius: 6, padding: 10, flex: 1 }}>
              <Text style={{ color: "#C4AA8A", fontSize: 8 }}>PLAN ACTIV</Text>
              <Text style={{ color: amber, fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 }}>{plan}</Text>
            </View>
            <View style={{ backgroundColor: "rgba(245,215,160,0.1)", borderRadius: 6, padding: 10, flex: 1 }}>
              <Text style={{ color: "#C4AA8A", fontSize: 8 }}>DATA EMITERII</Text>
              <Text style={{ color: light, fontSize: 12, marginTop: 2 }}>{date}</Text>
            </View>
          </View>
        </View>
        <View style={styles.coverFooter}>
          <Text style={styles.coverFooterText}>markethubpromo.com</Text>
          <Text style={styles.coverFooterText}>Confidential · Uz Personal</Text>
          <Text style={styles.coverFooterText}>© MarketHub Pro {new Date().getFullYear()}</Text>
        </View>
      </Page>

      {/* ═══ TABLE OF CONTENTS ═══ */}
      <Page size="A4" style={styles.page}>
        <Text style={{ fontSize: 20, fontFamily: "Helvetica-Bold", color: dark, marginBottom: 6 }}>Cuprins</Text>
        <Text style={{ fontSize: 10, color: muted, marginBottom: 24 }}>Acest ghid conține instrucțiuni pentru 4 platforme API</Text>

        {[
          { n: 1, title: "YouTube Data API", sub: "Trending, canale, video-uri, analitica proprie" },
          { n: 2, title: "Instagram & Facebook", sub: "Analitica cont propriu, reach, impressions" },
          { n: 3, title: "News API", sub: "Stiri Romania si Creator Economy" },
          { n: 4, title: "Configurare Finala", sub: "Verifica setarile, troubleshooting, suport" },
        ].map(item => (
          <View key={item.n} style={styles.tocItem}>
            <View style={styles.tocNum}><Text style={styles.tocNumText}>{item.n}</Text></View>
            <Text style={styles.tocTitle}>{item.title}</Text>
            <Text style={styles.tocSub}>{item.sub}</Text>
          </View>
        ))}

        <View style={{ marginTop: 30, backgroundColor: "rgba(245,215,160,0.1)", borderRadius: 8, padding: 16, borderWidth: 1, borderColor: border }}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: dark, marginBottom: 8 }}>Timp estimat de configurare</Text>
          <Text style={{ fontSize: 10, color: muted, lineHeight: 1.7 }}>
            YouTube API: ~10 minute{"\n"}
            Instagram/Facebook: ~15 minute (necesita cont business){"\n"}
            News API: ~2 minute{"\n"}
            {"  "}────────────────{"\n"}
            Total: aproximativ 27-30 de minute
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
          YouTube API iți permite să accesezi date reale: video-uri trending din orice tara, statistici canal propriu,
          cautare canale, analitica video-uri. Este gratuit pana la 10.000 unitati/zi (suficient pentru uz normal).
        </Text>

        <Step n={1} title="Creeaza un cont Google (daca nu ai)">
          <Text style={styles.stepText}>Ai nevoie de un cont Google activ. Daca ai Gmail, este suficient.</Text>
          <Url url="https://accounts.google.com" />
        </Step>
        <Step n={2} title="Acceseaza Google Cloud Console">
          <Text style={styles.stepText}>
            Deschide Google Cloud Console si accepta termenii de utilizare la prima accesare.
          </Text>
          <Url url="https://console.cloud.google.com" />
        </Step>
        <Step n={3} title="Creeaza un proiect nou">
          <Text style={styles.stepText}>
            Sus in bara, click pe selectorul de proiecte → "NEW PROJECT"{"\n"}
            • Project name: MarketHub Pro (sau orice nume){"\n"}
            • Click "CREATE" si asteapta ~10 secunde
          </Text>
        </Step>
        <Step n={4} title="Activeaza YouTube Data API v3">
          <Text style={styles.stepText}>
            In meniul din stanga → "APIs & Services" → "Library"{"\n"}
            Cauta: YouTube Data API v3{"\n"}
            Click pe rezultat → buton albastru "ENABLE"
          </Text>
          <Tip>Asigura-te ca esti in proiectul corect (verifici sus in bara)</Tip>
        </Step>
        <Step n={5} title="Genereaza API Key">
          <Text style={styles.stepText}>
            In meniul din stanga → "APIs & Services" → "Credentials"{"\n"}
            Click "+ CREATE CREDENTIALS" → "API key"{"\n"}
            Se genereaza automat un key de forma: AIzaSy...{"\n"}
            Click "COPY" sau noteaza-l
          </Text>
          <Warning>Nu impartasi API key-ul cu nimeni! Trateaza-l ca o parola.</Warning>
        </Step>
        <Step n={6} title="Lipeste in MarketHub Pro Settings">
          <Text style={styles.stepText}>
            Mergi la markethubpromo.com → Settings (meniu stanga, jos){"\n"}
            Campul "YouTube API Key" → lipeste key-ul{"\n"}
            Click "Salveaza" → apare mesaj verde de confirmare{"\n"}
            {"\n"}
            Opcional: adauga si "YouTube Channel ID" pentru pagina "My Channel"{"\n"}
            Channel ID format: UCxxxxxxxxxxxxxxxxxxxxxxx{"\n"}
            Il gasesti pe YouTube → contul tau → About → Share → Copy channel ID
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
          Meta API permite accesul la analitica contului tau de Instagram si pagina de Facebook: followers,
          reach, impressions, engagement. Necesita cont Business/Creator si pagina Facebook conectata la Instagram.
        </Text>

        <Step n={1} title="Pregateste contul de Instagram Business">
          <Text style={styles.stepText}>
            In Instagram → Profil → Editare Profil → Tip cont{"\n"}
            Schimba in "Professional Account" → "Business" sau "Creator"{"\n"}
            Conecteaza o pagina de Facebook (obligatoriu pentru API)
          </Text>
          <Warning>Conturile personale Instagram nu sunt suportate de API. Trebuie cont Business/Creator.</Warning>
        </Step>
        <Step n={2} title="Creeaza aplicatie pe Meta for Developers">
          <Text style={styles.stepText}>
            Logheaza-te cu contul Facebook la:{"\n"}
          </Text>
          <Url url="https://developers.facebook.com" />
          <Text style={{ ...styles.stepText, marginTop: 6 }}>
            Click "My Apps" → "Create App"{"\n"}
            Alege tipul: "Business" → Next{"\n"}
            App name: MarketHub Pro → Create App
          </Text>
        </Step>
        <Step n={3} title="Adauga Instagram Graph API">
          <Text style={styles.stepText}>
            In dashboard-ul aplicatiei → "+ Add Product"{"\n"}
            Gaseste "Instagram Graph API" → "Set Up"{"\n"}
            Urmeaza pasii de configurare de baza
          </Text>
        </Step>
        <Step n={4} title="Genereaza Access Token">
          <Text style={styles.stepText}>
            Tools → Graph API Explorer{"\n"}
            Selecteaza aplicatia ta din dropdown{"\n"}
            Click "Generate Access Token" → autorizeaza{"\n"}
            Copiaza token-ul generat (incepe cu "EAA...")
          </Text>
          <Warning>Token-urile expirate cauzeaza erori. Daca vezi eroare 404 in platforma, regenereaza tokenul.</Warning>
        </Step>
        <Step n={5} title="Conecteaza in MarketHub Pro">
          <Text style={styles.stepText}>
            Mergi la markethubpromo.com → Settings{"\n"}
            Sectiunea Instagram → click "Conecteaza Instagram"{"\n"}
            Sau lipeste manual Access Token-ul in campul dedicat{"\n"}
            Click "Salveaza"
          </Text>
          <Tip>Dupa conectare, datele Instagram apar pe pagina Overview si My Channel (daca ai canal de muzica)</Tip>
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
          News API furnizeaza stiri in timp real din Romania si global. In MarketHub Pro vei vedea
          Top Headlines Romania + stiri Creator Economy (YouTube, TikTok, Instagram). Planul gratuit:
          100 cereri/zi, suficient pentru uz normal.
        </Text>

        <Step n={1} title="Creeaza cont pe NewsAPI.org">
          <Text style={styles.stepText}>Inregistrare gratuita, nu necesita card bancar.</Text>
          <Url url="https://newsapi.org/register" />
        </Step>
        <Step n={2} title="Copiaza API Key-ul">
          <Text style={styles.stepText}>
            Dupa inregistrare si confirmare email:{"\n"}
            Mergi la newsapi.org/account{"\n"}
            Sectiunea "Your API key" → copiaza key-ul (32 caractere)
          </Text>
        </Step>
        <Step n={3} title="Adauga in MarketHub Pro Settings">
          <Text style={styles.stepText}>
            markethubpromo.com → Settings{"\n"}
            Campul "News API Key" → lipeste key-ul{"\n"}
            Click "Salveaza"
          </Text>
          <Tip>Pagina News va afisa imediat stiri reale din Romania si Creator Economy global</Tip>
        </Step>
        <View style={{ marginTop: 10, padding: 14, backgroundColor: "rgba(245,215,160,0.1)", borderRadius: 6, borderWidth: 1, borderColor: border }}>
          <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: dark, marginBottom: 6 }}>Limitari Plan Gratuit</Text>
          <Text style={{ fontSize: 9.5, color: muted, lineHeight: 1.65 }}>
            • 100 cereri/zi (MarketHub Pro face cache 30min deci foloseste putine cereri){"\n"}
            • Stiri cu max 1 luna in urma{"\n"}
            • Fara filtrare avansata{"\n"}
            Plan Developer ($449/luna): fara limite, date in timp real{"\n"}
            Pentru uzul normal, planul gratuit este suficient.
          </Text>
        </View>
        <PageFooter name={name} />
      </Page>

      {/* ═══ SECTION 4: FINAL CONFIG ═══ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>4</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Configurare Finala si Troubleshooting</Text>
            <Text style={styles.sectionPlatform}>Verificare + Rezolvare Probleme Comune</Text>
          </View>
        </View>

        <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: dark, marginBottom: 10 }}>Checklist Final</Text>
        {[
          "YouTube API Key adaugat in Settings → apare trending pe pagina Trending si Global",
          "YouTube Channel ID adaugat → pagina My Channel afiseaza datele canalului tau",
          "Instagram conectat → datele apar pe Overview (foloweri, reach, impressions)",
          "News API Key → pagina News afiseaza stiri Romania + Creator Economy",
        ].map((item, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 7 }}>
            <View style={{ width: 16, height: 16, borderRadius: 3, borderWidth: 1.5, borderColor: amber, marginRight: 10, marginTop: 1 }} />
            <Text style={{ fontSize: 9.5, color: dark, flex: 1, lineHeight: 1.5 }}>{item}</Text>
          </View>
        ))}

        <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: dark, marginTop: 20, marginBottom: 10 }}>Probleme Comune</Text>
        {[
          { prob: "Eroare: API key not configured", sol: "Mergi la Settings si salveaza din nou key-ul. Asigura-te ca nu are spatii goale." },
          { prob: "YouTube: quota exceeded", sol: "Ai depasit 10.000 unitati/zi gratuite. Asteapta pana a doua zi sau creeaza alt proiect." },
          { prob: "Instagram 404 / token expired", sol: "Tokenul Meta expira periodic. Mergi la Settings → reconecteaza Instagram." },
          { prob: "News: eroare de conexiune", sol: "Verifica News API key. Planul gratuit permite doar 100 cereri/zi." },
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
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: amber, marginBottom: 8 }}>Ai nevoie de ajutor?</Text>
          <Text style={{ fontSize: 9.5, color: "#C4AA8A", lineHeight: 1.7 }}>
            In platforma → click butonul "Setup Agent" (coltul din dreapta jos){"\n"}
            Agentul AI te ghideaza interactiv prin orice configurare.{"\n"}
            {"\n"}
            Email suport: support@markethubpromo.com{"\n"}
            Site: markethubpromo.com{"\n"}
            {"\n"}
            Salut, {name}! Mult succes cu MarketHub Pro 🎯
          </Text>
        </View>
        <PageFooter name={name} />
      </Page>

    </Document>
  );
}
