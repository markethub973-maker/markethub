/**
 * Romanian TTS Standard Rules (validated phonetically with Eduard).
 *
 * Central source of truth for ALL Romanian Text-to-Speech prompts across
 * every platform (Azure Speech Emil/Alina, ElevenLabs multilingual v2,
 * OpenAI tts-1). Rules were validated by listening tests — when a correction
 * is made once, it becomes the permanent standard.
 *
 * Two public exports:
 *   1. `ROMANIAN_TTS_PROMPT_RULES` — text block to append to any LLM system
 *      prompt that generates Romanian text destined for TTS.
 *   2. `sanitizeRomanianForTts(text)` — post-processing pass that applies
 *      word substitutions + SSML phoneme hints safely.
 *   3. `wrapRomanianSsml(text, voice)` — full SSML wrapper with prosody
 *      (name sign-offs drop tone on final letter, like real calling-out).
 *
 * Maintenance rule: every time Eduard approves a new phonetic correction,
 * add it here — do NOT inline in route handlers. See memory file
 * `romanian_tts_standard_rules.md` for history + context per rule.
 */

/**
 * Prompt fragment — append this to LLM system prompt whenever generating
 * Romanian text that will be read aloud by TTS. Covers Azure Emil/Alina
 * quirks (verb endings, contractions, mixed-language words) which are the
 * worst offenders.
 */
export const ROMANIAN_TTS_PROMPT_RULES = `ROMANIAN TTS PRODUCTION RULES (apply strictly — validated listening tests):

LANGUAGE PURITY:
- Use ONLY natural, clean Romanian words. NO mixed-language terms.
- FORBIDDEN English infiltrations in Romanian text: "content", "dashboard", "AI", "SMB", "template", "brief", "feedback", "review", "marketing" (as a replacement for "promovare"), "business" (use "afacere"), "online" (use "în mediul digital").
- Replacements: "conținut" (content), "platformă" (dashboard), "inteligență artificială" OR omit entirely (AI), "firme mici" (SMB), "șablon" (template), "plan" (brief).
- Spell ALL numbers out: "zece ori" NOT "10x", "douăzeci" NOT "20", "cinci sute" NOT "500".

PUNCTUATION FOR PROSODY:
- Only ONE question mark at the END of the actual question.
- Do NOT end sentences with "?" when the final clause is a subordinate/consequence.
  · WRONG: "Vrei demo, ca să vezi cum arată?" (TTS rises on "arată" — unnatural)
  · RIGHT: "Vrei un demo? Ca să vezi cum arată în practică." (question + declarative)
- Each sentence 8-15 words max for natural intonation.
- End every sentence with clear punctuation (period, question mark, exclamation).

AZURE EMIL (male RO) QUIRKS — AVOID:
- 2nd-person singular verbs ending in "-ezi" (gestionezi, lucrezi) → Emil doubles the final 'i'.
  · Replace with noun constructs or "ai" form. Ex: "firmele pe care le ai" NOT "firmele pe care le gestionezi".
- Verbs ending in "-izi" (analizi, organizezi) → same doubling issue. Use periphrase.
- Adjective plurals ending in "-ii" (mulții, clienții) → prefer "mulți clienți" (article-last pattern).
- Prefer 2p sg forms ending in OTHER letters: "ai", "vezi", "primești", "ajutăm".

AZURE EMIL CONTRACTIONS — REWRITE HYPHENATED FORMS:
- "v-ar" → pronounced "vear" instead of "var". Use "Ați vrea?" or full "v-ar" with SSML phoneme override.
- "m-ar" → "Mi-ar plăcea" should be "Aș vrea".
- "ne-ar" → "Ne-ar ajuta" should be "Ne ajută".
- "ți-ar" → "Ți-ar conveni?" should be "Vă convine?".
- General rule: prefer auxiliary forms over contractions. "Ai" "ați" "aș" "ar" + full verb is safest.

SIGN-OFFS AND NAMES (validated):
- Personal sign-off: "— Eduard." (period after) — NOT "— Alex". Eduard is the real founder.
- Name pronunciation: "Eduard" must have descending tone on final 'D' (like calling someone).
  This is handled by the SSML wrapper — do NOT add extra markup in the text.

OUTPUT CONSTRAINT:
- Output ONLY the script text, no markdown, no quotes, no commentary.
- Word count: stay within the target (e.g., 60-75 words for 30s pitch).`;

/**
 * Word/phrase substitutions applied before sending to TTS engines.
 * These are RAW string replacements — case-insensitive, word-boundary-aware.
 * Each replacement has a comment explaining which Eduard listening test validated it.
 */
const RO_TTS_SUBSTITUTIONS: Array<{ pattern: RegExp; replacement: string; reason: string }> = [
  // Hyphenated contractions that Azure Emil mispronounces
  { pattern: /\bm-ar\s+plăcea\b/gi, replacement: "aș vrea", reason: "m-ar pronounced as mear; aș vrea is safer" },
  { pattern: /\bne-ar\s+ajuta\b/gi, replacement: "ne ajută", reason: "ne-ar pronunciation issue" },
  { pattern: /\bți-ar\s+conveni\b/gi, replacement: "vă convine", reason: "ți-ar hyphen dropped to formal you" },

  // Mixed-language infiltrations (keep as safety net even if prompt says avoid)
  { pattern: /\b10x\b/gi, replacement: "zece ori", reason: "numerals must be spelled out" },
  { pattern: /\b20x\b/gi, replacement: "de douăzeci de ori", reason: "numerals spelled out" },
  { pattern: /\bSMB\b/g, replacement: "firme mici", reason: "English abbreviation banned in RO" },
  { pattern: /\bAI\b/g, replacement: "inteligență artificială", reason: "ah-ee pronunciation — spell it out" },
];

/**
 * Phoneme overrides for words that Azure still mispronounces after substitution.
 * Key = word in text; value = IPA phoneme Azure should honor via SSML.
 * Only applied when producing SSML (Azure path). ElevenLabs/OpenAI ignore this.
 */
const RO_TTS_PHONEMES: Array<{ word: string; ipa: string; reason: string }> = [
  { word: "v-ar", ipa: "var", reason: "Emil says 'vear'; force short A like in 'adevărat'" },
  { word: "V-ar", ipa: "var", reason: "capitalized sentence-start variant" },
];

/**
 * Pre-process text before TTS. Apply this once before sending to ANY provider.
 * Returns plain text with word substitutions applied. SSML phoneme injection
 * happens separately in `wrapRomanianSsml` for Azure path only.
 */
export function sanitizeRomanianForTts(text: string): string {
  let out = text;
  for (const { pattern, replacement } of RO_TTS_SUBSTITUTIONS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Escape special SSML characters in a chunk of plain text.
 */
function escapeSsml(text: string): string {
  return text.replace(/[<>&]/g, (c) => (c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;"));
}

/**
 * Inject `<phoneme>` tags around words that need forced IPA pronunciation.
 * Operates on pre-escaped text — do NOT call on raw user-provided strings
 * without escaping first (done inside wrapRomanianSsml).
 */
function injectPhonemes(escapedText: string): string {
  let out = escapedText;
  for (const { word, ipa } of RO_TTS_PHONEMES) {
    // Word-boundary replacement; keep case-sensitive so "V-ar" and "v-ar"
    // map to their own entries (one per case in RO_TTS_PHONEMES).
    const re = new RegExp(`(^|[\\s.,!?;:])(${word.replace(/[-]/g, "\\-")})(?=[\\s.,!?;:]|$)`, "g");
    out = out.replace(re, (_, pre, w) => `${pre}<phoneme alphabet="ipa" ph="${ipa}">${w}</phoneme>`);
  }
  return out;
}

/**
 * Apply sign-off prosody — makes "Eduard" at the end drop tone on final D,
 * like a real human calling-out. Uses Azure `<prosody pitch>` + explicit
 * contour to force descending intonation on the last syllable.
 *
 * Detects patterns like: "— Eduard.", "- Eduard.", "Eduard." at end of text.
 */
function applySignoffProsody(escapedText: string): string {
  // Match optional em-dash/hyphen + whitespace + Eduard + punctuation at end
  return escapedText.replace(
    /([—-]\s*)?(Eduard)(\.?)\s*$/,
    (_match, dash, name, dot) => {
      const prefix = dash ?? "";
      // pitch contour: start mid-high, descend sharply on final "D"
      return `${prefix}<prosody pitch="+2st" contour="(0%,+2st)(60%,+0st)(100%,-4st)" rate="0.92">${name}</prosody>${dot}`;
    },
  );
}

/**
 * Full SSML wrapper for Azure Speech (Emil / Alina).
 * Apply `sanitizeRomanianForTts` BEFORE calling this (handled by the
 * synthesizer helper in tts.ts — this function only wraps).
 */
export function wrapRomanianSsml(text: string, voice: string): string {
  const clipped = text.slice(0, 4000);
  const escaped = escapeSsml(clipped);
  const withPhonemes = injectPhonemes(escaped);
  const withProsody = applySignoffProsody(withPhonemes);
  return `<speak version='1.0' xml:lang='ro-RO' xmlns:mstts='https://www.w3.org/2001/mstts'><voice name='${voice}'>${withProsody}</voice></speak>`;
}
