const DEFAULT_BASE_URL = "https://api.deepseek.com";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ModelOptions = {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
};

export type ModelUsage = {
  promptTokens: number;
  completionTokens: number;
  model: string;
  provider: "deepseek";
};

export function getDeepSeekModel(kind: "planner" | "router" = "planner") {
  if (kind === "router") {
    return process.env.DEEPSEEK_ROUTER_MODEL || process.env.DEEPSEEK_MODEL || "deepseek-chat";
  }
  return process.env.DEEPSEEK_MODEL || "deepseek-chat";
}

function extractJson(content: string): unknown {
  const clean = content.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  const candidates = [clean];
  if (start >= 0 && end > start) candidates.push(clean.slice(start, end + 1));
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      const repaired = candidate
        .replace(/,\s*([}\]])/g, "$1")
        .replace(/}\s*{/g, "},{")
        .replace(/]\s*{/g, "],{");
      try { return JSON.parse(repaired); } catch { /* try the next candidate */ }
    }
  }
  throw new Error("DeepSeek 没有返回有效的 JSON");
}

export async function callModelJson<T>(options: ModelOptions): Promise<{ data: T; usage: ModelUsage }> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) throw new Error("DeepSeek API 尚未配置");

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = options.model || getDeepSeekModel();
  const payload = {
    model,
    messages: options.messages,
    response_format: { type: "json_object" },
    temperature: options.temperature ?? 0.15,
    max_tokens: options.maxTokens ?? 4200,
    stream: false,
  };

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(options.timeoutMs ?? 32_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("DeepSeek API 请求超时，请稍后重试；复杂行程可先缩短天数再继续修改");
    }
    throw new Error(`无法连接 DeepSeek API：${error instanceof Error ? error.message : "未知网络错误"}`);
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    if (response.status === 401) throw new Error("DeepSeek API Key 无效或没有访问权限");
    if (response.status === 402) throw new Error("DeepSeek API 账户余额不足");
    if (response.status === 429) throw new Error("DeepSeek API 请求过于频繁，请稍后再试");
    throw new Error(`DeepSeek API 请求失败（${response.status}）：${detail}`);
  }

  const result = await response.json() as {
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek API 返回了空结果");

  return {
    data: extractJson(content) as T,
    usage: {
      provider: "deepseek",
      model: result.model || model,
      promptTokens: result.usage?.prompt_tokens || 0,
      completionTokens: result.usage?.completion_tokens || 0,
    },
  };
}
