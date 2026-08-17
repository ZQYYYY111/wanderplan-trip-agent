const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";

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
    return process.env.DEEPSEEK_ROUTER_MODEL || process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;
  }
  return process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;
}

function extractJson(content: string): unknown {
  const clean = content
    .replace(/^\uFEFF/, "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const candidates = [clean, ...balancedJsonCandidates(clean)];
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

function balancedJsonCandidates(value: string) {
  const candidates: string[] = [];
  for (let start = 0; start < value.length; start += 1) {
    if (value[start] !== "{" && value[start] !== "[") continue;
    const stack: string[] = [];
    let inString = false;
    let escaped = false;
    for (let index = start; index < value.length; index += 1) {
      const char = value[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') { inString = true; continue; }
      if (char === "{" || char === "[") stack.push(char);
      else if (char === "}" || char === "]") {
        const expected = char === "}" ? "{" : "[";
        if (stack.pop() !== expected) break;
        if (!stack.length) {
          candidates.push(value.slice(start, index + 1));
          start = index;
          break;
        }
      }
    }
  }
  return candidates;
}

type ChatResult = {
  model?: string;
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: string | Array<{ type?: string; text?: string }>; reasoning_content?: string };
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

function messageText(result: ChatResult) {
  const message = result.choices?.[0]?.message;
  if (typeof message?.content === "string") return message.content;
  if (Array.isArray(message?.content)) return message.content.map(part => part.text || "").join("");
  return message?.reasoning_content || "";
}

async function postChat(baseUrl: string, apiKey: string, payload: Record<string, unknown>, timeoutMs: number) {
  const send = async (body: Record<string, unknown>) => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (attempt === 0 && [502, 503, 504].includes(response.status)) continue;
        return response;
      } catch (error) {
        lastError = error;
        const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
        if (attempt > 0 || timedOut) throw error;
      }
    }
    throw lastError;
  };
  let response = await send(payload);
  if ((response.status === 400 || response.status === 422) && "response_format" in payload) {
    const detail = await response.text();
    if (/response[_ -]?format|json[_ -]?object/i.test(detail)) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.response_format;
      response = await send(fallbackPayload);
    } else {
      return { response, detail };
    }
  }
  return { response, detail: undefined as string | undefined };
}

export async function callModelJson<T>(options: ModelOptions): Promise<{ data: T; usage: ModelUsage }> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) throw new Error("DeepSeek API 尚未配置");

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = options.model || getDeepSeekModel();
  const payload: Record<string, unknown> = {
    model,
    messages: options.messages,
    response_format: { type: "json_object" },
    thinking: { type: "disabled" },
    temperature: options.temperature ?? 0.15,
    max_tokens: options.maxTokens ?? 4200,
    stream: false,
  };

  let response: Response;
  let responseDetail: string | undefined;
  try {
    ({ response, detail: responseDetail } = await postChat(baseUrl, apiKey, payload, options.timeoutMs ?? 32_000));
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("DeepSeek API 请求超时，请稍后重试；复杂行程可先缩短天数再继续修改");
    }
    throw new Error(`无法连接 DeepSeek API：${error instanceof Error ? error.message : "未知网络错误"}`);
  }

  if (!response.ok) {
    const detail = (responseDetail ?? await response.text()).slice(0, 400);
    if (response.status === 401) throw new Error("DeepSeek API Key 无效或没有访问权限");
    if (response.status === 402) throw new Error("DeepSeek API 账户余额不足");
    if (response.status === 429) throw new Error("DeepSeek API 请求过于频繁，请稍后再试");
    throw new Error(`DeepSeek API 请求失败（${response.status}）：${detail}`);
  }

  let result = await response.json() as ChatResult;
  let content = messageText(result);
  if (!content) throw new Error("DeepSeek API 返回了空结果");

  let data: T;
  try {
    data = extractJson(content) as T;
  } catch {
    const repairPayload: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: "把用户提供的内容转换成一个语义等价、完整、可由 JSON.parse 解析的 JSON。不要解释，不要 Markdown，不要省略字段。" },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
      temperature: 0,
      max_tokens: Math.min(Math.max(options.maxTokens ?? 4200, 1200), 8192),
      stream: false,
    };
    const repaired = await postChat(baseUrl, apiKey, repairPayload, Math.max(options.timeoutMs ?? 32_000, 18_000));
    if (!repaired.response.ok) throw new Error("DeepSeek 没有返回有效的 JSON，自动修复也失败");
    result = await repaired.response.json() as ChatResult;
    content = messageText(result);
    if (!content) throw new Error("DeepSeek JSON 修复返回了空结果");
    data = extractJson(content) as T;
  }

  return {
    data,
    usage: {
      provider: "deepseek",
      model: result.model || model,
      promptTokens: result.usage?.prompt_tokens || 0,
      completionTokens: result.usage?.completion_tokens || 0,
    },
  };
}
