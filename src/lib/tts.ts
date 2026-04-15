/**
 * Unified TTS layer for Alex's voice.
 *
 * Priority:
 *   1. ElevenLabs (native RO pronunciation, multilingual v2) — if ELEVENLABS_API_KEY set
 *   2. OpenAI tts-1 (fallback; English-accented RO)
 *
 * Returns both the bytes and the MIME/container info so callers can pick
 * the right Telegram method (sendVoice for opus, sendAudio for mp3).
 */

export type TtsResult = {
  audio: ArrayBuffer;
  mime: string;
  /** "opus" → Telegram sendVoice; "mp3" → Telegram sendAudio */
  format: "opus" | "mp3";
};

// ElevenLabs voice IDs — deep male founder vibe
const ELEVEN_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "pNInz6obpgDQGcFmaJgB"; // "Adam"
const ELEVEN_MODEL = "eleven_multilingual_v2";

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
 * Synthesize speech from text. Uses ElevenLabs if configured, else OpenAI.
 */
export async function synthesizeSpeech(text: string): Promise<TtsResult | null> {
  const eleven = await elevenLabsTts(text);
  if (eleven) return eleven;
  return await openaiTts(text);
}
