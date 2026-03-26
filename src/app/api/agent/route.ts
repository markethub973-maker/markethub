import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { AGENTS, AgentType, getAgentPrompt } from "@/lib/agents";
import { getAnthropicErrorResponse } from "@/lib/anthropic-errors";
import { createClient } from "@/lib/supabase/server";
import { getAppApiKey } from "@/lib/anthropic-client";

export async function POST(req: NextRequest) {
  let appApiKey: string;
  try {
    appApiKey = getAppApiKey();
  } catch {
    return new Response(JSON.stringify({ error: "Agent not configured" }), { status: 500 });
  }

  // Check authentication + admin status
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.is_admin === true;

  const { messages, agentType = "support" } = await req.json();

  const agent = AGENTS[agentType as AgentType];
  if (!agent) {
    return new Response(JSON.stringify({ error: "Unknown agent type" }), { status: 400 });
  }

  // Admin gets full access; regular users get confidentiality-restricted prompt
  const systemPrompt = getAgentPrompt(agentType as AgentType, isAdmin);

  const client = new Anthropic({ apiKey: appApiKey });
  const encoder = new TextEncoder();

  // Start stream — catch errors gracefully
  let stream: ReturnType<typeof client.messages.stream>;
  try {
    stream = client.messages.stream({
      model: agent.model,
      max_tokens: agent.maxTokens,
      system: systemPrompt,
      messages,
    });
    // Trigger first chunk to surface auth/billing errors early
    await stream.initialMessage();
  } catch (err: any) {
    console.error("[Agent API] Stream init error:", err?.status, err?.error?.type, err?.message);
    const { error } = getAnthropicErrorResponse(err);
    return new Response(JSON.stringify({ error }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (err: any) {
        console.error("[Agent API] Stream error:", err?.status, err?.error?.type, err?.message);
        const { error } = getAnthropicErrorResponse(err);
        // Send friendly error message into the stream so the UI can display it
        controller.enqueue(encoder.encode(`\n\n${error}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Transfer-Encoding": "chunked" },
  });
}
