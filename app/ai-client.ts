import OpenAI from "openai";

type AIConfig = { baseURL: string; apiKey: string; model: string };

async function getAIConfig(): Promise<AIConfig> {
  const { env } = await import("cloudflare:workers");
  const baseURL = String(env.AI_BASE_URL ?? "");
  const apiKey = String(env.AI_API_KEY ?? "");
  const model = String(env.AI_MODEL ?? "gpt-4o-mini");
  if (!baseURL || !apiKey) throw new Error("AI service is not configured (missing AI_BASE_URL or AI_API_KEY).");
  return { baseURL, apiKey, model };
}

async function getAIClient() {
  const { baseURL, apiKey } = await getAIConfig();
  return new OpenAI({ baseURL, apiKey });
}

export type AIMessage = { role: "system" | "user" | "assistant"; content: string };

export async function generateText(messages: AIMessage[], options?: { model?: string; temperature?: number; maxTokens?: number }): Promise<string> {
  const client = await getAIClient();
  const { model: defaultModel } = await getAIConfig();
  const response = await client.chat.completions.create({
    model: options?.model ?? defaultModel,
    messages,
    temperature: options?.temperature,
    max_tokens: options?.maxTokens,
  });
  return response.choices[0]?.message?.content ?? "";
}

function extractJSON(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return candidate;
  return candidate.slice(start, end + 1);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateJSON<T>(messages: AIMessage[], options?: { model?: string; temperature?: number; maxTokens?: number; retries?: number }): Promise<T> {
  const client = await getAIClient();
  const { model: defaultModel } = await getAIConfig();
  const maxAttempts = 1 + (options?.retries ?? 2);
  let lastError: Error = new Error("AI request failed");
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      // Not all OpenAI-compatible relays honour response_format for every backend model
      // (some pass Claude's raw markdown-fenced output straight through, and pooled/relay
      // backends can also intermittently return an empty completion), so this asks for JSON
      // via the prompt, defensively unwraps fences/prose, and retries transient empty replies.
      const response = await client.chat.completions.create({
        model: options?.model ?? defaultModel,
        messages,
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
      });
      const content = response.choices[0]?.message?.content ?? "";
      if (!content.trim()) throw new Error(`AI response was empty (finish_reason: ${response.choices[0]?.finish_reason ?? "unknown"}).`);
      return JSON.parse(extractJSON(content)) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts) await sleep(400 * attempt);
    }
  }
  throw lastError;
}
