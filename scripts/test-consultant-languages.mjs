#!/usr/bin/env node
/**
 * M9 Consultant — Multilingual test suite
 *
 * Tests the consultant system prompt directly against Anthropic Haiku 4.5
 * in 12 languages + verifies KB match behaviour.
 *
 * Run: node scripts/test-consultant-languages.mjs
 * Needs: ANTHROPIC_API_KEY in env (loaded from .env.local)
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (no dotenv dep)
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
}

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
if (!ANTHROPIC_KEY) {
  console.error("❌ Missing ANTHROPIC_API_KEY");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
const supa = SUPABASE_URL && SUPABASE_SR ? createClient(SUPABASE_URL, SUPABASE_SR) : null;

const HAIKU = "claude-haiku-4-5-20251001";

// Same prompt as /api/consultant/chat/route.ts (keep in sync!)
const CONSULTANT_SYSTEM = `You are the MarketHub Pro Consultant — an in-product strategic advisor for a social media marketing SaaS.

## Your role
Help the user accomplish their goal. Depending on the question, you act at one of 4 levels:
 1. EXPLANATION  — they ask "what does X do?" → clear short explanation + where to find it.
 2. ALTERNATIVES — they ask "how do I do X?" → give 2–3 concrete options with trade-offs.
 3. CONTEXTUAL  — they seem stuck (based on signals the client sends) → proactive, specific suggestion.
 4. STRATEGIC   — they ask about growth/ROI → analyze their context, recommend a concrete next step.

Pick the level that matches the question. Do NOT force a level.

## Language rules
Auto-detect the user's language. Reply in the SAME language (EN, RO, FR, DE, ES, IT, PT, PL, NL, and more).

## Platform knowledge
MarketHub Pro = social media management platform for agencies & creators.
Plans: Starter (14d trial), Creator ($24), Pro ($49), Studio ($99), Agency ($249).
Features: Analytics (YouTube/IG/TikTok/LinkedIn/Facebook), Content Calendar with auto-publish,
CRM + Lead Finder, Reviews Management, AI Agents, Campaign Builder, Client Portal, White-label,
Smart Scheduling, Content Recycling, Sentiment Analysis, Ask Consultant (you), Support Tickets.
Integrations: Stripe, Resend (email), Telegram + WhatsApp, OAuth (YT/IG/TT/LI/FB).

## Output format
Return ONLY valid JSON:
{
  "level": 1|2|3|4,
  "language": "en|ro|fr|...",
  "response": "Your reply to the user (in their language, markdown allowed)",
  "confidence": 0.0-1.0,
  "suggested_action": {"label": "...", "url": "/path"} | null
}

## Style
Warm, concise, specific. No filler. Skip caveats unless truly relevant. If strategic, be opinionated.
If you don't know, say so — don't invent features that don't exist.`;

// 12 languages x canonical question asking about Instagram connection
// (this exact topic has a KB entry in resolved_issues — tests KB matching)
const TEST_CASES = [
  { code: "en", name: "English",    q: "My Instagram connection says the token expired. How do I fix it?" },
  { code: "ro", name: "Romanian",   q: "Instagram zice că token-ul a expirat. Cum rezolv?" },
  { code: "fr", name: "French",     q: "Mon Instagram affiche que le jeton a expiré. Comment réparer ?" },
  { code: "de", name: "German",     q: "Meine Instagram-Verbindung zeigt, dass das Token abgelaufen ist. Wie behebe ich das?" },
  { code: "es", name: "Spanish",    q: "Mi Instagram dice que el token expiró. ¿Cómo lo arreglo?" },
  { code: "it", name: "Italian",    q: "La mia connessione Instagram dice che il token è scaduto. Come risolvo?" },
  { code: "pt", name: "Portuguese", q: "Meu Instagram diz que o token expirou. Como resolvo?" },
  { code: "pl", name: "Polish",     q: "Moje Instagram mówi, że token wygasł. Jak to naprawić?" },
  { code: "nl", name: "Dutch",      q: "Mijn Instagram zegt dat het token is verlopen. Hoe los ik dit op?" },
  // Stretch — "and more"
  { code: "ja", name: "Japanese",   q: "Instagramの接続でトークンが期限切れと表示されます。どうすれば直りますか？" },
  { code: "tr", name: "Turkish",    q: "Instagram bağlantım token süresi doldu diyor. Nasıl düzeltirim?" },
  { code: "ar", name: "Arabic",     q: "اتصال Instagram الخاص بي يقول أن الرمز المميز منتهي الصلاحية. كيف أصلحه؟" },
];

async function testLanguage(tc) {
  const start = Date.now();
  try {
    const resp = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1024,
      system: CONSULTANT_SYSTEM,
      messages: [{ role: "user", content: tc.q }],
    });
    const text = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);

    const ms = Date.now() - start;
    const langOk = parsed.language === tc.code;
    const mentionsReconnect = /reconnect|reconect|reconnect|reconn|再接続|yeniden|إعادة/i.test(parsed.response ?? "");
    const confidenceOk = typeof parsed.confidence === "number" && parsed.confidence > 0.5;

    return {
      ...tc,
      ok: langOk && confidenceOk,
      langOk,
      confidenceOk,
      mentionsReconnect,
      level: parsed.level,
      detectedLang: parsed.language,
      confidence: parsed.confidence,
      responsePreview: (parsed.response ?? "").slice(0, 120).replace(/\n/g, " "),
      ms,
    };
  } catch (e) {
    return { ...tc, ok: false, error: e.message, ms: Date.now() - start };
  }
}

async function testKBSearch() {
  if (!supa) return { ok: false, reason: "no supabase creds" };

  const queries = [
    { q: "instagram token expired", expectMatch: true },
    { q: "cancel subscription", expectMatch: true },
    { q: "TikTok rate limit", expectMatch: true },
    { q: "import CSV leads", expectMatch: true },
    { q: "purple elephant recipe", expectMatch: false }, // garbage
  ];

  const results = [];
  for (const t of queries) {
    const terms = t.q.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((x) => x.length >= 3).slice(0, 8);
    if (terms.length === 0) {
      results.push({ q: t.q, ok: !t.expectMatch, reason: "no usable terms" });
      continue;
    }
    const tsquery = terms.join(" OR ");
    const { data, error } = await supa
      .from("resolved_issues")
      .select("id,symptom,usage_count")
      .textSearch("symptom", tsquery, { type: "websearch", config: "simple" })
      .limit(3);

    const found = (data ?? []).length;
    const pass = t.expectMatch ? found > 0 : found === 0;
    results.push({
      q: t.q,
      ok: pass,
      found,
      error: error?.message,
      topMatch: data?.[0]?.symptom?.slice(0, 80),
    });
  }
  return { ok: results.every((r) => r.ok), results };
}

(async () => {
  console.log(`\n🌍 M9 Consultant — Multilingual test suite`);
  console.log(`   Model: ${HAIKU}`);
  console.log(`   Testing ${TEST_CASES.length} languages\n`);

  const results = [];
  for (const tc of TEST_CASES) {
    process.stdout.write(`  ${tc.code.padEnd(3)} ${tc.name.padEnd(12)} `);
    const r = await testLanguage(tc);
    results.push(r);
    if (r.ok) {
      console.log(
        `✅ lang=${r.detectedLang} L${r.level} conf=${r.confidence} (${r.ms}ms)`,
      );
    } else {
      console.log(
        `❌ lang=${r.detectedLang ?? "?"} ${r.error ? "ERR: " + r.error : `(langOk=${r.langOk} confOk=${r.confidenceOk})`} (${r.ms}ms)`,
      );
    }
    if (r.responsePreview) {
      console.log(`      → "${r.responsePreview}..."`);
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const detected = results.filter((r) => r.langOk).length;
  const reconMent = results.filter((r) => r.mentionsReconnect).length;

  console.log(`\n📊 Results`);
  console.log(`   Pass rate       : ${passed}/${results.length} (${Math.round((passed / results.length) * 100)}%)`);
  console.log(`   Language match  : ${detected}/${results.length}`);
  console.log(`   "reconnect" hint: ${reconMent}/${results.length} (topical relevance)`);

  console.log(`\n🔎 KB Search test (M5 integration)`);
  const kb = await testKBSearch();
  if (kb.reason) {
    console.log(`   SKIP: ${kb.reason}`);
  } else {
    for (const r of kb.results) {
      console.log(`   ${r.ok ? "✅" : "❌"} "${r.q}" → ${r.found} matches${r.topMatch ? ` (top: "${r.topMatch}...")` : ""}${r.error ? " ERR: " + r.error : ""}`);
    }
    console.log(`   KB overall: ${kb.ok ? "PASS" : "FAIL"}`);
  }

  process.exit(passed === results.length && kb.ok ? 0 : 1);
})();
