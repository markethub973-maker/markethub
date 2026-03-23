import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { AGENT_PROMPTS, AGENTS, AgentType } from "@/lib/agents";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "Agent not configured" }), { status: 500 });
  }

  const { messages, agentType = "support" } = await req.json();

  const agent = AGENTS[agentType as AgentType];
  if (!agent) {
    return new Response(JSON.stringify({ error: "Unknown agent type" }), { status: 400 });
  }

  const systemPrompt = AGENT_PROMPTS[agentType as AgentType];

  const stream = client.messages.stream({
    model: agent.model,
    max_tokens: agent.maxTokens,
    system: systemPrompt,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (e) {
        controller.error(e);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Transfer-Encoding": "chunked" },
  });
}
