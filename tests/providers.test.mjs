import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";

test("DeepSeek is the only runtime LLM provider and its key stays server-side",async()=>{
  const source=await readFile(new URL("../lib/llm.ts",import.meta.url),"utf8");
  const agent=await readFile(new URL("../lib/trip-agent.ts",import.meta.url),"utf8");
  assert.match(source,/process\.env\.DEEPSEEK_API_KEY/);
  assert.match(source,/https:\/\/api\.deepseek\.com/);
  assert.match(source,/response_format/);
  assert.doesNotMatch(source,/sk-[A-Za-z0-9_-]{20,}/);
  assert.match(agent,/callModelJson/);
  assert.doesNotMatch(agent,/BAILIAN_|callBailian/);
});

test("hosted FlyAI adapter requires an application-owned key",async()=>{
  const source=await readFile(new URL("../lib/flyai.ts",import.meta.url),"utf8");
  assert.match(source,/process\.env\.FLYAI_API_KEY/);
  assert.doesNotMatch(source,/sk-fa[A-Za-z0-9_-]+/);
  assert.match(source,/search_poi/);
  assert.doesNotMatch(source,/jumpUrl|ticketInfo/);
});

test("Amap key remains server-side and route APIs are wired",async()=>{
  const source=await readFile(new URL("../lib/amap.ts",import.meta.url),"utf8");
  assert.match(source,/process\.env\.AMAP_WEB_SERVICE_KEY/);
  assert.match(source,/\/v3\/place\/text/);
  assert.match(source,/\/v5\/direction\/walking/);
  assert.match(source,/\/v5\/direction\/transit\/integrated/);
});
