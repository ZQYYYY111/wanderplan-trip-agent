import {callModelJson,getDeepSeekModel,type ModelUsage} from "./llm";
import {runSkillPhase,selectSkills,skillPrompt} from "./skill-registry";
import {routeTripRequest} from "./trip-router";
import type {AgentIntent,SkillContext} from "../skills/runtime-types";
import type {TripChange,TripDay,TripPlan,Trace} from "../app/trip-data";

type ModelResult={message:string;trip:TripPlan|null;needsClarification?:boolean};
type RevisionPatch={title?:string;destination?:string;dates?:string;travelers?:string;budget?:number;notices?:string[];assumptions?:string[];budgetBreakdown?:Array<{label:string;amount:number}>;dayChanges?:Array<{dayNumber:number;day:TripDay}>};
type RevisionResult={message:string;patch:RevisionPatch;needsClarification?:boolean};
export type AgentResult=ModelResult&{usage:ModelUsage[];intent:AgentIntent;trace:Trace[];changes:TripChange[]};

const plannerBase=`你是“漫游策”查询与规划智能体，只输出 JSON，不输出 Markdown。严格禁止执行或暗示已完成预订、下单、占座和支付；可以提供查询结果、候选建议和规划。动态事实无法核验时明确标注待核验。回答不能只有概览，必须做到用户拿着计划就知道每天按什么顺序走、怎么移动、吃什么、各环节大约多久和花多少钱。
TripPlan 包含 id,title,destination,dates,travelers,budget,version,days,notices,assumptions,sources,budgetBreakdown。不要输出 shareToken、ownerToken 或任何访问凭证。day 包含 routeSummary 与 meals；activity 包含 id,time,title,detail,tag,cost,duration,transport,food,tips,mapUrl。detail 写2-4句具体游览动作和看点，不能只写景点名称。source 只能使用工具结果里真实提供的 URL，禁止编造 URL。
每个 day 必须包含 date、weekday、theme、area、weather、activities；每个 activity.time 必须严格使用两位小时的 HH:MM，例如 09:00，不能写 9:00。
输出 {"message":"...","trip":{...},"needsClarification":false}。`;

function mapSearchUrl(destination:string,title:string){return `https://www.amap.com/search?query=${encodeURIComponent(`${destination} ${title}`)}`}
function attachResearchSources(trip:TripPlan,toolResults:Record<string,unknown>){const research=toolResults.webResearch as {sources?:Array<{url:string;query?:string;kind?:"evidence"|"search"}>}|undefined;const retrievedAt=new Date().toISOString();const discovered=(research?.sources||[]).filter(source=>/^https?:\/\//.test(source.url)).map(source=>{let host="查询来源";try{host=new URL(source.url).hostname.replace(/^www\./,"")}catch{host="查询来源"}return{label:source.query?`${source.kind==="search"?"搜索入口":"来源"} · ${source.query}`:host,url:source.url,retrievedAt,freshness:source.kind==="search"?"reference" as const:"recent" as const}});const combined=[...trip.sources,...discovered];trip.sources=combined.filter((source,index,list)=>list.findIndex(other=>other.url===source.url)===index).slice(0,12);return trip}

function normalize(raw:TripPlan,current:TripPlan|null,intent:AgentIntent){
 const now=Date.now().toString(36);const trip:TripPlan={...raw,id:intent==="new_trip"?`trip-${crypto.randomUUID()}`:(current?.id||raw.id||`trip-${now}`),version:intent==="new_trip"?1:intent==="revise_trip"&&current?current.version+1:(current?.version??1),budget:Math.max(0,Math.round(Number(raw.budget)||0)),notices:Array.isArray(raw.notices)?raw.notices.slice(0,8):[],assumptions:Array.isArray(raw.assumptions)?raw.assumptions.slice(0,8):[],sources:Array.isArray(raw.sources)?raw.sources.filter(s=>s?.url&&/^https?:\/\//.test(s.url)).slice(0,10):[],days:Array.isArray(raw.days)?raw.days.slice(0,7):[],budgetBreakdown:Array.isArray(raw.budgetBreakdown)?raw.budgetBreakdown.map(x=>({...x,amount:Math.max(0,Math.round(Number(x.amount)||0))})).slice(0,8):[]};
 trip.days.forEach((day,di)=>{day.date||=`第${di+1}天`;day.weekday||="";day.theme||=`${trip.destination}第${di+1}天`;day.area||=trip.destination;day.weather||="待查询";day.routeSummary||=`围绕${day.area}顺路游览，具体交通时间出发前再次核验`;const rawMeals=Array.isArray(day.meals)?day.meals as unknown[]:[];day.meals=rawMeals.filter(Boolean).map(meal=>{if(typeof meal==="string")return meal;const item=meal as {type?:string;suggestion?:string;restaurant?:string;dishes?:string[]|string;cost?:number;area?:string};const dishes=Array.isArray(item.dishes)?item.dishes.join("、"):item.dishes;const details=[item.suggestion,item.restaurant,item.area,dishes,item.cost?`约 ¥${item.cost}`:""].filter(Boolean).join(" · ");return details?`${item.type||"用餐"}：${details}`:(item.type||"用餐建议待补充")}).slice(0,4);day.activities=Array.isArray(day.activities)?day.activities.slice(0,6):[];day.activities.forEach((a,ai)=>{a.id||=`d${di+1}-a${ai+1}-${now}`;if(/^\d:\d{2}$/.test(a.time))a.time=`0${a.time}`;a.cost=Math.max(0,Math.round(Number(a.cost)||0));a.duration=typeof a.duration==="number"?`约 ${a.duration} 分钟`:(a.duration||"时长待确认");a.transport||="从上一站按实时地图选择步行或公共交通";a.tips||="开放时间与临时调整请在出发前核验";a.mapUrl=mapSearchUrl(trip.destination,a.title)});day.activities.sort((a,b)=>a.time.localeCompare(b.time));if(!day.meals.length){const foods=day.activities.filter(a=>a.food).map(a=>a.food!);day.meals=foods.length?foods.slice(0,3):[`${day.area}附近选择本地代表性餐饮，具体店铺营业状态出发前核验`]}});
 const plannedCost=trip.days.flatMap(day=>day.activities).reduce((sum,activity)=>sum+activity.cost,0);const breakdown=trip.budgetBreakdown??[];const accounted=breakdown.reduce((sum,item)=>sum+item.amount,0);if(!breakdown.length&&trip.budget>0){trip.budgetBreakdown=[{label:"行程内活动与餐饮",amount:Math.min(plannedCost,trip.budget)}];if(plannedCost<trip.budget)trip.budgetBreakdown.push({label:"住宿、往返交通与机动",amount:trip.budget-plannedCost})}else if(accounted<trip.budget)breakdown.push({label:"机动预算",amount:trip.budget-accounted});return trip
}
function validate(trip:TripPlan){const errors:string[]=[];if(!trip.title||!trip.destination||!trip.dates||!trip.travelers)errors.push("基础字段不完整");if(!trip.days.length)errors.push("至少需要一天");const ids=new Set<string>();trip.days.forEach((d,di)=>{let last="00:00";if(!d.date||!d.theme||!d.routeSummary||!d.activities.length)errors.push(`第${di+1}天不完整`);d.activities.forEach(a=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time))errors.push(`${a.id}时间错误`);if(a.time<last)errors.push(`第${di+1}天顺序错误`);if(!a.id||ids.has(a.id))errors.push("活动ID缺失或重复");if(!a.detail||!a.duration||!a.transport)errors.push(`${a.id}缺少路线细节`);ids.add(a.id);last=a.time})});const budgetTotal=(trip.budgetBreakdown??[]).reduce((sum,item)=>sum+item.amount,0);if(budgetTotal>trip.budget)errors.push(`预算拆分 ${budgetTotal} 元超过总预算 ${trip.budget} 元`);return errors}
function diff(before:TripPlan|null,after:TripPlan|null):TripChange[]{if(!after)return[];if(!before)return[{type:"added",label:"创建行程",after:`${after.destination} · ${after.days.length}天 · ¥${after.budget}`}];const result:TripChange[]=[];if(before.budget!==after.budget)result.push({type:"changed",label:"总预算",before:`¥${before.budget}`,after:`¥${after.budget}`});if(before.days.length!==after.days.length)result.push({type:"changed",label:"行程天数",before:`${before.days.length}天`,after:`${after.days.length}天`});const oldMap=new Map(before.days.flatMap(d=>d.activities).map(a=>[a.id,a]));const newMap=new Map(after.days.flatMap(d=>d.activities).map(a=>[a.id,a]));for(const[id,a]of oldMap)if(!newMap.has(id))result.push({type:"removed",label:a.title});for(const[id,a]of newMap){const old=oldMap.get(id);if(!old)result.push({type:"added",label:a.title});else if(old.title!==a.title||old.time!==a.time||old.detail!==a.detail)result.push({type:"changed",label:a.title,before:`${old.time} ${old.title}`,after:`${a.time} ${a.title}`})}return result.slice(0,8)}

function applyRevisionPatch(current:TripPlan,patch:RevisionPatch){
 const trip:TripPlan={...current,days:current.days.map(day=>({...day,activities:day.activities.map(activity=>({...activity})),meals:day.meals?[...day.meals]:undefined})),notices:[...current.notices],assumptions:[...current.assumptions],sources:[...current.sources],budgetBreakdown:current.budgetBreakdown?.map(item=>({...item}))};
 if(typeof patch.title==="string"&&patch.title.trim())trip.title=patch.title.trim();
 if(typeof patch.destination==="string"&&patch.destination.trim())trip.destination=patch.destination.trim();
 if(typeof patch.dates==="string"&&patch.dates.trim())trip.dates=patch.dates.trim();
 if(typeof patch.travelers==="string"&&patch.travelers.trim())trip.travelers=patch.travelers.trim();
 if(Number.isFinite(Number(patch.budget)))trip.budget=Math.max(0,Math.round(Number(patch.budget)));
 if(Array.isArray(patch.notices))trip.notices=patch.notices;
 if(Array.isArray(patch.assumptions))trip.assumptions=patch.assumptions;
 if(Array.isArray(patch.budgetBreakdown))trip.budgetBreakdown=patch.budgetBreakdown;
 for(const change of patch.dayChanges||[]){const index=Math.round(Number(change.dayNumber))-1;if(index>=0&&index<trip.days.length&&change.day?.activities?.length)trip.days[index]=change.day}
 return trip;
}

export async function runTripAgent(input:string,currentTrip:TripPlan|null,history:Array<{role:string;text:string}>=[]):Promise<AgentResult>{
 const route={data:routeTripRequest(input,currentTrip)};
 const selected=selectSkills(route.data.intent);
 const initial:SkillContext={input,intent:route.data.intent,currentTrip,destination:route.data.destination||currentTrip?.destination||null,startDate:route.data.startDate,toolResults:{}};
 const prepared=await runSkillPhase(selected,"prepare",initial);
 const usage:ModelUsage[]=[];
 let planned:ModelResult;

 if(route.data.intent==="revise_trip"&&currentTrip){
  const revisionPrompt=`你是结构化行程修改器，只输出 JSON。不要重写未受影响的天。输出 {"message":"修改摘要","patch":{"title":可选,"destination":可选,"dates":可选,"travelers":可选,"budget":可选,"notices":可选,"assumptions":可选,"budgetBreakdown":可选,"dayChanges":[{"dayNumber":从1开始,"day":完整修改后当天}]},"needsClarification":false}。day 与 activity 字段遵守 TripPlan schema；保留未删除活动的原 id；时间使用 HH:MM。只查询与规划，不声称预订。`;
  const revision=await callModelJson<RevisionResult>({model:getDeepSeekModel(),maxTokens:2600,temperature:0,timeoutMs:60_000,messages:[{role:"system",content:`${revisionPrompt}\n\n本轮实际加载的 Skills：\n${skillPrompt(selected)}`},{role:"user",content:JSON.stringify({userInput:input,currentTrip,recentConversation:history.slice(-4),toolResults:prepared.context.toolResults})}]});
  usage.push(revision.usage);
  planned={message:revision.data.message,trip:applyRevisionPatch(currentTrip,revision.data.patch||{}),needsClarification:revision.data.needsClarification};
 }else{
  const planningTrip=route.data.intent==="new_trip"?null:currentTrip;
  const planningRequest={model:getDeepSeekModel(),maxTokens:4200,temperature:.05,timeoutMs:75_000,messages:[{role:"system" as const,content:`${plannerBase}\n\n本轮实际加载的 Skills：\n${skillPrompt(selected)}`},{role:"user" as const,content:JSON.stringify({userInput:input,intent:route.data.intent,extractedConstraints:route.data,currentTrip:planningTrip,recentConversation:history.slice(-6),toolResults:prepared.context.toolResults})}]};
  const response=await callModelJson<ModelResult>(planningRequest);planned=response.data;usage.push(response.usage);
  if(!planned.trip&&route.data.intent==="new_trip"){
   const retry=await callModelJson<ModelResult>({...planningRequest,maxTokens:3600,temperature:0,timeoutMs:60_000,messages:[...planningRequest.messages,{role:"user",content:"首次响应缺少 trip。请严格按要求返回完整、可校验的 TripPlan JSON；不要改为解释性回答。"}]});
   planned=retry.data;usage.push(retry.usage);
  }
 }

 if(!planned.trip){if(route.data.intent==="clarify"||route.data.intent==="answer_trip")return{...planned,trip:currentTrip,usage,intent:route.data.intent,trace:prepared.trace,changes:[]};throw new Error("模型未返回可用行程")}
 let trip=attachResearchSources(normalize(planned.trip,currentTrip,route.data.intent),prepared.context.toolResults);
 let errors=validate(trip);
 if(errors.length){const repaired=await callModelJson<{trip:TripPlan}>({model:getDeepSeekModel(),maxTokens:3600,temperature:0,timeoutMs:45_000,messages:[{role:"system",content:`你是结构化行程修复器，只返回 {"trip":{...}}。只修复列出的校验错误，保留原有内容、稳定 ID、查询边界和“只查询规划、不预订”的原则。所有时间严格使用 HH:MM。`},{role:"user",content:JSON.stringify({errors,trip})}]});usage.push(repaired.usage);trip=attachResearchSources(normalize(repaired.data.trip,currentTrip,route.data.intent),prepared.context.toolResults);errors=validate(trip)}
 if(errors.length)throw new Error(`行程校验失败：${errors.slice(0,3).join("；")}`);
 const enriched=await runSkillPhase(selected,"enrich",{...prepared.context,currentTrip:trip});trip=enriched.context.currentTrip||trip;errors=validate(trip);
 if(errors.length)throw new Error(`地图增强后校验失败：${errors.slice(0,3).join("；")}`);
 const validated=await runSkillPhase(selected,"validate",{...enriched.context,currentTrip:trip});
 return{...planned,trip,usage,intent:route.data.intent,trace:[...prepared.trace,...enriched.trace,...validated.trace],changes:diff(route.data.intent==="new_trip"?null:currentTrip,trip)}
}
