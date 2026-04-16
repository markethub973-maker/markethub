/**
 * Unified TTS layer for Alex's voice + per-agent voices (11 agents).
 *
 * Priority for Romanian text:
 *   1. Azure Speech (native RO, Emil male / Alina female) — if AZURE_SPEECH_KEY set
 *   2. ElevenLabs multilingual v2 — if ELEVENLABS_API_KEY set
 *   3. OpenAI tts-1 (last fallback; English-accented RO)
 *
 * Priority for non-Romanian text:
 *   1. ElevenLabs (native for EN, good for DE/FR/ES/IT)
 *   2. OpenAI fallback
 *
 * Romanian text passes through `sanitizeRomanianForTts` BEFORE every provider
 * (Azure, ElevenLabs, OpenAI) so word substitutions stay consistent. Azure
 * additionally gets `wrapRomanianSsml` which adds IPA phoneme overrides +
 * sign-off prosody. See `lib/romanian-tts-rules.ts` for the rule set.
 */

import { sanitizeRomanianForTts, wrapRomanianSsml } from "./romanian-tts-rules";

export type TtsResult = {
  audio: ArrayBuffer;
  mime: string;
  /** "opus" → Telegram sendVoice; "mp3" → Telegram sendAudio */
  format: "opus" | "mp3";
  voice_used?: string;
  provider?: "azure" | "elevenlabs" | "openai";
};

export type AgentId = "alex" | "cmo" | "sales" | "content" | "analyst" | "researcher" | "competitive" | "copywriter" | "strategist" | "finance" | "legal";

/**
 * Which voice each of the 11 agents uses. Female agents → Alina.
 * Male agents → Emil.
 */
const AGENT_VOICE_MAP: Record<AgentId, { azure: string; eleven: string; gender: "male" | "female" }> = {
  alex:        { azure: "ro-RO-EmilNeural",  eleven: "onwK4e9ZLuTAKqWW03F9", gender: "male" },   // CEO
  content:     { azure: "ro-RO-EmilNeural",  eleven: "onwK4e9ZLuTAKqWW03F9", gender: "male" },   // Marcus
  analyst:     { azure: "ro-RO-EmilNeural",  eleven: "onwK4e9ZLuTAKqWW03F9", gender: "male" },   // Ethan
  competitive: { azure: "ro-RO-EmilNeural",  eleven: "onwK4e9ZLuTAKqWW03F9", gender: "male" },   // Kai
  strategist:  { azure: "ro-RO-EmilNeural",  eleven: "onwK4e9ZLuTAKqWW03F9", gender: "male" },   // Leo
  legal:       { azure: "ro-RO-EmilNeural",  eleven: "onwK4e9ZLuTAKqWW03F9", gender: "male" },   // Theo
  cmo:         { azure: "ro-RO-AlinaNeural", eleven: "21m00Tcm4TlvDq8ikWAM", gender: "female" }, // Vera
  sales:       { azure: "ro-RO-AlinaNeural", eleven: "21m00Tcm4TlvDq8ikWAM", gender: "female" }, // Sofia
  researcher:  { azure: "ro-RO-AlinaNeural", eleven: "21m00Tcm4TlvDq8ikWAM", gender: "female" }, // Nora
  copywriter:  { azure: "ro-RO-AlinaNeural", eleven: "21m00Tcm4TlvDq8ikWAM", gender: "female" }, // Iris
  finance:     { azure: "ro-RO-AlinaNeural", eleven: "21m00Tcm4TlvDq8ikWAM", gender: "female" }, // Dara
};

// ElevenLabs voice IDs — deep male founder vibe (fallback for non-RO)
const ELEVEN_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "pNInz6obpgDQGcFmaJgB"; // "Adam"
const ELEVEN_MODEL = "eleven_multilingual_v2";

/**
 * Heuristic: detect if text is Romanian (uses RO-specific characters or common words).
 */
function isRomanian(text: string): boolean {
  // RO-specific diacritics
  if (/[ăâîșț]/i.test(text)) return true;
  // Common RO words (higher confidence if multiple)
  const roWords = (text.match(/\b(și|sunt|este|pentru|clientul|nostru|facem|acum|dacă|ce|de|la|dar|după|am|vom|foarte|bun|bine)\b/gi) ?? []).length;
  return roWords >= 2;
}

async function azureTts(text: string, agent: AgentId = "alex"): Promise<TtsResult | null> {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION ?? "westeurope";
  if (!key) return null;

  const voice = AGENT_VOICE_MAP[agent].azure;
  // sanitizeRomanianForTts already applied by `synthesizeSpeech` caller —
  // wrapRomanianSsml only adds IPA phoneme overrides + sign-off prosody.
  const ssml = wrapRomanianSsml(text, voice);

  try {
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-48khz-192kbitrate-mono-mp3",
        "User-Agent": "MarketHubPro/1.0",
      },
      body: ssml,
    });
    if (!res.ok) return null;
    const audio = await res.arrayBuffer();
    return { audio, mime: "audio/mpeg", format: "mp3", voice_used: voice, provider: "azure" };
  } catch {
    return null;
  }
}

async function elevenLabsTts(text: string): Promise<TtsResult | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.slice(0, 4000),
          model_id: ELEVEN_MODEL,
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.75,
            style: 0.25,
            use_speaker_boost: true,
          },
        }),
      },
    );
    if (!res.ok) return null;
    const audio = await res.arrayBuffer();
    return { audio, mime: "audio/mpeg", format: "mp3" };
  } catch {
    return null;
  }
}

async function openaiTts(text: string, voice = "onyx"): Promise<TtsResult | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "tts-1",
        voice,
        input: text.slice(0, 4000),
        response_format: "opus",
      }),
    });
    if (!res.ok) return null;
    const audio = await res.arrayBuffer();
    return { audio, mime: "audio/ogg; codecs=opus", format: "opus" };
  } catch {
    return null;
  }
}

/**
 * Synthesize speech from text with agent-aware voice selection.
 * Priority:
 *   - Romanian text → Azure (Emil/Alina native RO) if AZURE_SPEECH_KEY set
 *   - Other languages or Azure missing → ElevenLabs
 *   - Fallback → OpenAI
 */
export async function synthesizeSpeech(
  text: string,
  opts: { agent_id?: AgentId } = {},
): Promise<TtsResult | null> {
  const agent = opts.agent_id ?? "alex";
  const ro = isRomanian(text);
  // Apply Romanian sanitizer once for ALL providers so any fallback path
  // (Azure → ElevenLabs → OpenAI) reads the same cleaned-up text.
  const cleaned = ro ? sanitizeRomanianForTts(text) : text;

  if (ro) {
    const azure = await azureTts(cleaned, agent);
    if (azure) return azure;
  }

  const eleven = await elevenLabsTts(cleaned);
  if (eleven) return eleven;

  return await openaiTts(cleaned);
}
