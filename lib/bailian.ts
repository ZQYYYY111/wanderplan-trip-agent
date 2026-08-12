const DEFAULT_BASE_URL = "https://llm-zn6q9hwu66if9fdi.cn-beijing.maas.aliyuncs.com/compatible-mode/v1";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type BailianOptions = {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  enableSearch?: boolean;
};

export type BailianUsage = {
  promptTokens: number;
  completionTokens: number;
  model: string;
};

function extractJson(content: string): unknown {
  const clean = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  try { return JSON.parse(clean); } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
    throw new Error("模型没有返回有效的 JSON");
  }
}

export async function callBailianJson<T>(options: BailianOptions): Promise<{ data: T; usage: BailianUsage }> {
  const apiKey = process.env.BAILIAN_API_KEY;
  if (!apiKey) throw new Error("百炼 API 尚未配置");
  const baseUrl = (process.env.BAILIAN_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = options.model || process.env.BAILIAN_MODEL || "qwen3.6-plus";
  const payload: Record<string, unknown> = {
    model,
    messages: options.messages,
    response_format: { type: "json_object" },
    temperature: options.temperature ?? 0.15,
    max_tokens: options.maxTokens ?? 5000,
    enable_thinking: false,
  };
  if (options.enableSearch) payload.enable_search = true;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`百炼 API 请求失败（${response.status}）：${detail}`);
  }
  const result = await response.json() as {
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("百炼 API 返回了空结果");
  return {
    data: extractJson(content) as T,
    usage: {
      model: result.model || model,
      promptTokens: result.usage?.prompt_tokens || 0,
      completionTokens: result.usage?.completion_tokens || 0,
    },
  };
}
