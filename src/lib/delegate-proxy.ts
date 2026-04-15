/**
 * Delegate Proxy — generates Eduard's response automatically when he's away.
 * Runs AFTER Alex's synthesis on the boardroom endpoint. Reads active rules
 * and crafts a founder-style reply, logs everything.
 */

import { generateText } from "@/lib/llm";
import { createServiceClient } from "@/lib/supabase/service";
import { ALEX_KNOWLEDGE_BRIEF } from "@/lib/alex-knowledge";

export interface DelegateSession {
  id: number;
  ends_at: string;
  rules: Record<string, boolean>;
}

export async function getActiveDelegate(): Promise<DelegateSession | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("delegate_sessions")
    .select("*")
    .eq("active", true)
    .gt("ends_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as DelegateSession | null) ?? null;
}

export async function generateProxyResponse(
  session: DelegateSession,
  alexSynthesis: string,
  originalQuestion: string,
): Promise<string | null> {
  const rulesList = Object.entries(session.rules)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(", ");

  const sys = `${ALEX_KNOWLEDGE_BRIEF}

---

You are acting AS Eduard, the Founder of MarketHub Pro, while he is away from the keyboard. You have been delegated for ${Math.round((new Date(session.ends_at).getTime() - Date.now()) / 60000)} minutes.

Eduard's active rules (things he REQUIRES you to enforce):
${rulesList}

Alex (his CEO) just delivered a synthesis. You reply briefly in Eduard's voice — direct, partner-tone, Romanian. You may:
  - Approve small tactical moves (outreach batches ≤ 25 domains, content drafts, copy tweaks)
  - Confirm standard follow-ups
  - Provide realistic context from Eduard's known reality (zero budget, focus on RO + intl €499/€1000, first client needed in 72h)

You must REFUSE:
  - Pricing changes (block_pricing_changes = true)
  - Any new spending (no_spending = true)
  - Target-market pivots (block_pivots = true)
  - Decisions the rules don't authorize — escalate via "AȘTEAPTĂ — Eduard decide la întoarcere"

Output: short message, 60-100 words, signed "— Eduard (via AI Delegate)". Never pretend to be the real Eduard — be transparent this is proxy.`;

  const user = `Alex's last synthesis:\n${alexSynthesis}\n\nContext: Eduard's original question was: ${originalQuestion}`;
  const out = await generateText(sys, user, { maxTokens: 400 });
  return out?.trim() ?? null;
}

export async function logProxyDecision(
  sessionId: number,
  question: string,
  synthesis: string,
  proxyResponse: string,
): Promise<void> {
  const svc = createServiceClient();
  const { data: current } = await svc
    .from("delegate_sessions")
    .select("approvals")
    .eq("id", sessionId)
    .single();
  const approvals = Array.isArray(current?.approvals) ? current.approvals : [];
  approvals.push({
    ts: new Date().toISOString(),
    question,
    synthesis: synthesis.slice(0, 500),
    proxy_response: proxyResponse,
  });
  await svc.from("delegate_sessions").update({ approvals }).eq("id", sessionId);
}

export async function notifyTelegramDelegate(
  proxyResponse: string,
  synthesis: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!token || !chatId) return;
  const text = `🛡️ *DELEGATE ACTIVE*\n\n*Alex a spus:*\n${synthesis.slice(0, 280)}${synthesis.length > 280 ? "..." : ""}\n\n*Proxy-ul a răspuns în numele tău:*\n${proxyResponse}`;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } catch { /* no-op */ }
}
