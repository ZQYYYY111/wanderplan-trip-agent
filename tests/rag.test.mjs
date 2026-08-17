import assert from "node:assert/strict";
import test from "node:test";
import {retrieveTravelKnowledge} from "../lib/rag.ts";

test("RAG prioritizes senior-friendly pacing and food guidance",()=>{
  const result=retrieveTravelKnowledge("带父母去成都，少走路，喜欢美食，预算6000元","成都",5);
  assert.equal(result.strategy,"weighted-lexical-bigram");
  assert.equal(result.hits[0].id,"pace-senior-friendly");
  assert.ok(result.hits.some(hit=>hit.id==="food-route-integration"));
  assert.ok(result.hits.length<=5);
});

test("RAG retrieves weather contingency guidance",()=>{
  const result=retrieveTravelKnowledge("第三天如果下雨就换成室内方案","贵州",3);
  assert.equal(result.hits[0].id,"weather-rain-alternative");
});

test("RAG boosts destination-specific high-altitude safety",()=>{
  const result=retrieveTravelKnowledge("第一次去高原，行程轻松一点","拉萨",3);
  assert.equal(result.hits[0].id,"risk-high-altitude");
});
