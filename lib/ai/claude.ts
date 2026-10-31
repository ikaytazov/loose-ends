// Shared way to ask Claude for a structured answer that matches a schema in lib/contracts/ai.ts.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/server/env";

/** Take the answer from a tool call if there is one, otherwise from JSON in the text. */
export function readStructured<T>(content: Anthropic.ContentBlock[], schema: z.ZodType<T>): T {
  const tool = content.find((b) => b.type === "tool_use");
  if (tool && tool.type === "tool_use") return schema.parse(tool.input);
  const text = content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI did not return an answer in the expected format");
  return schema.parse(JSON.parse(text.slice(start, end + 1)));
}

/**
 * Ask Claude and get back data that matches `schema`.
 * Not every model accepts a *forced* tool call, so we offer one tool, ask for it, and also accept plain JSON.
 */
export async function askStructured<T>(opts: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  toolName: string;
  toolDescription: string;
  maxTokens?: number;
}): Promise<T> {
  const client = new Anthropic({ apiKey: env.anthropicKey() });
  const inputSchema = z.toJSONSchema(opts.schema) as Anthropic.Tool.InputSchema;
  const res = await client.messages.create({
    model: env.anthropicModel(),
    max_tokens: opts.maxTokens ?? 4000,
    system: `${opts.system}\n\nAlways answer by calling the ${opts.toolName} tool exactly once. If you cannot call it, reply with only the same JSON object.`,
    tools: [{ name: opts.toolName, description: opts.toolDescription, input_schema: inputSchema }],
    messages: [{ role: "user", content: opts.user }],
  });
  return readStructured(res.content, opts.schema);
}
