import type {RuntimeSkill,SkillContext} from "../runtime-types";
import {retrieveTravelKnowledge} from "../../lib/rag";

export const retrieveTravelKnowledgeSkill:RuntimeSkill={
 name:"retrieve-travel-knowledge",label:"RAG 旅行知识检索",phase:"prepare",description:"从应用内旅行知识库检索与当前需求相关的路线、节奏、预算、美食和风险原则。",
 provenance:{source:"Original curated travel knowledge corpus",pattern:"weighted lexical and Chinese-bigram retrieval; no local model"},
 instructions:"使用 ragContext.hits 作为规划原则。工具返回的实时事实优先于知识库；知识库不是实时证据，不得把知识条目放进 TripPlan.sources，也不得用它断言当前票价、营业时间、天气或限流。若条目与用户明确要求冲突，优先遵守用户要求并说明风险。",
 supports:intent=>intent==="new_trip"||intent==="revise_trip"||intent==="answer_trip",
 async run(context:SkillContext){const started=Date.now();const result=retrieveTravelKnowledge(context.input,context.destination,5);return{context:{toolResults:{...context.toolResults,ragContext:result}},trace:{name:this.name,label:this.label,status:"completed",detail:`从知识库 v${result.version} 检索到 ${result.hits.length} 条规划原则：${result.hits.map(hit=>hit.title).join("、")}`,code:`rag ${result.strategy} · hits: ${result.hits.length}`,durationMs:Date.now()-started}}}
};
