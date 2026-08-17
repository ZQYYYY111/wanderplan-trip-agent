const DEFAULT_BASE_URL = "https://llm-zn6q9hwu66if9fdi.cn-beijing.maas.aliyuncs.com/compatible-mode/v1";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type BailianOptions = {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  enableSearch?: boolean;
  searchOptions?: { forcedSearch?: boolean; enableSource?: boolean; searchStrategy?: "turbo" | "max" | "agent" };
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
  if (options.searchOptions) payload.search_options = {
    forced_search: options.searchOptions.forcedSearch,
    enable_source: options.searchOptions.enableSource,
    search_strategy: options.searchOptions.searchStrategy,
  };

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(options.timeoutMs ?? 45_000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("百炼 API 请求超时，请稍后重试，或改用更快的模型/缩小本次规划范围");
    }
    throw error;
  }
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

export type BailianWebResearch={summary:string;sources:Array<{url:string;query?:string}>;usage:BailianUsage};
export async function callBailianWebResearch(input:string):Promise<BailianWebResearch>{
  const apiKey=process.env.BAILIAN_API_KEY;if(!apiKey)throw new Error("百炼 API 尚未配置");
  const baseUrl=(process.env.BAILIAN_BASE_URL||DEFAULT_BASE_URL).replace(/\/$/,"");const model=process.env.BAILIAN_MODEL||"qwen3.6-plus";
  const response=await fetch(`${baseUrl}/chat/completions`,{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model,messages:[{role:"system",content:"你是旅行研究员。只返回 JSON：{\"summary\":\"中文摘要\",\"sources\":[{\"url\":\"https://...\",\"query\":\"检索词\"}]}。sources 只能包含你通过联网检索实际获得的网页 URL；没有可靠 URL 时返回空数组。不要提供预订、下单或支付入口。"},{role:"user",content:input}],response_format:{type:"json_object"},temperature:0.1,max_tokens:1200,enable_search:true,search_options:{forced_search:true,enable_source:true,search_strategy:"turbo"},enable_thinking:false}),signal:AbortSignal.timeout(12_000)});
  if(!response.ok)throw new Error(`百炼联网研究失败（${response.status}）`);
  const result=await response.json() as {model?:string;choices?:Array<{message?:{content?:string}}> ;usage?:{prompt_tokens?:number;completion_tokens?:number}};
  const parsed=extractJson(result.choices?.[0]?.message?.content||"{}") as {summary?:string;sources?:Array<{url?:string;query?:string}>};
  const sources=(parsed.sources||[]).filter(source=>source.url&&/^https?:\/\//.test(source.url)).map(source=>({url:source.url!,query:source.query})).filter((source,index,list)=>list.findIndex(other=>other.url===source.url)===index).slice(0,12);
  return{summary:parsed.summary||"",sources,usage:{model:result.model||model,promptTokens:result.usage?.prompt_tokens||0,completionTokens:result.usage?.completion_tokens||0}};
}
