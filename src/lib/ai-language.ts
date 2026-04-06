/**
 * Shared language detection instruction for all AI agents.
 *
 * MarketHub Pro is an international platform — agents must detect
 * the user's language from their input and respond in that language.
 * The UI, field labels and technical terms always stay in English.
 */

export const LANGUAGE_INSTRUCTION = `
LANGUAGE RULES (mandatory — always follow):
- Detect the language from the user's input text automatically.
- Respond entirely in that same language.
- Examples: English input → English response. Spanish input → Spanish response. French input → French response.
- Apply this rule for ANY language (Romanian, Arabic, Japanese, German, Italian, Portuguese, Turkish, etc.).
- Never mention the app's origin country or assume any default market.
- When no user input is available (automated/scheduled tasks), default to English.
- Never mix languages within the same response.
- Keep technical terms, platform names (Instagram, TikTok, YouTube) and proper nouns in their original form.
`.trim();

/**
 * Append the language instruction to any system prompt.
 */
export function withLanguage(systemPrompt: string): string {
  return `${systemPrompt}\n\n${LANGUAGE_INSTRUCTION}`;
}

/**
 * Detect language from user input for use in prompts.
 * Pass userInput to give Claude a hint when language can't be inferred from context.
 */
export function languageHint(userInput: string): string {
  return `\n\nDetect the language of this input and respond in that same language: "${userInput.slice(0, 100)}"`;
}
