import { callModelJson, getDeepSeekModel } from "../lib/llm.ts";

const startedAt = Date.now();
const result = await callModelJson({
  model: getDeepSeekModel("router"),
  temperature: 0,
  maxTokens: 300,
  timeoutMs: 30_000,
  messages: [
    {
      role: "system",
      content: "你是旅行需求提取器，只返回合法 JSON，字段为 destination、days、travelers、budget。",
    },
    {
      role: "user",
      content: "10月带父母去成都2天，预算4000元，少走路。",
    },
  ],
});

console.log(JSON.stringify({
  ok: true,
  elapsedMs: Date.now() - startedAt,
  model: result.usage.model,
  data: result.data,
}));
