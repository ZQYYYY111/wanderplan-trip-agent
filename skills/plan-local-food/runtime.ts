import type {RuntimeSkill,SkillContext} from "../runtime-types";

function foodResearch(destination:string,input:string){
 const preference=/清淡|不辣|素食|海鲜|甜品|咖啡|夜市|小吃|过敏|忌口/.exec(input)?.[0]||"当地特色";
 const queries=[`${destination} ${preference} 特色美食`,`${destination} 老字号 美食街`,`${destination} 早餐 夜市 小吃`];
 return {
  preference,
  planningRules:["把餐饮安排到当天游览片区，避免跨城打卡","每天至少给出午餐和晚餐区域、代表菜与人均预算","店名和营业状态未由工具核验时，用候选或搜索入口表述","涉及过敏或忌口时，在每一天重复关键提醒"],
  searchLinks:queries.map(query=>({label:query,url:`https://www.baidu.com/s?wd=${encodeURIComponent(query)}`})),
 };
}

export const planLocalFood:RuntimeSkill={
 name:"plan-local-food",label:"本地美食路线",phase:"prepare",description:"按游览片区、口味和预算生成餐饮规划材料与搜索入口。",
 provenance:{source:"SkillHub travelassistant public feature summary + original implementation",pattern:"food preference, local dishes, allergy warning, meal-area routing"},
 instructions:"使用 foodResearch 安排餐饮。每天写午餐和晚餐的推荐片区、2-4 个代表菜或餐饮类型、人均预算、与前后景点的衔接；优先同片区，避免为了网红店大幅折返。未核验营业状态时只写候选和搜索入口。只查询与规划，不订座、不下单。",
 supports:intent=>intent==="new_trip"||intent==="answer_trip",
 async run(context:SkillContext){const started=Date.now();if(!context.destination)return{trace:{name:this.name,label:this.label,status:"warning",detail:"尚未识别目的地，本轮跳过美食路线",code:"destination missing",durationMs:Date.now()-started}};const result=foodResearch(context.destination,context.input);return{context:{toolResults:{...context.toolResults,foodResearch:result}},trace:{name:this.name,label:this.label,status:"completed",detail:`已按“${result.preference}”准备分区餐饮规则和 ${result.searchLinks.length} 个搜索入口`,code:`food preference: ${result.preference} · links: ${result.searchLinks.length}`,durationMs:Date.now()-started}}}
};
