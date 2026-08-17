import type {RuntimeSkill,SkillContext} from "../runtime-types";

function assess(input:string,destination:string){
 const flags:string[]=[];
 if(/父母|老人|长辈|老年/.test(input))flags.push("长辈同行：降低步行强度，加入午休、厕所和就医可达性提醒");
 if(/儿童|孩子|宝宝|婴儿|亲子/.test(input))flags.push("儿童同行：控制连续游览时长，预留补给和提前返程选项");
 if(/过敏|忌口|素食|清真/.test(input))flags.push("饮食限制：餐饮建议必须重复标注过敏或忌口核验");
 if(/轮椅|行动不便|膝盖|腿脚|爬坡/.test(input))flags.push("行动限制：减少台阶、陡坡和长距离换乘，优先无障碍路径");
 if(/西藏|拉萨|青海|稻城|香格里拉|高原/.test(destination+input))flags.push("高海拔：放慢首日节奏；健康风险需咨询专业医生，规划不替代医疗建议");
 if(!flags.length)flags.push("常规风险：核验天气、临时闭馆、末班交通，并为每天保留一个可取消活动");
 return {flags,checklist:["身份证件与必要药品","舒适防滑鞋和天气对应装备","重要景点开放/限流信息复核","返程与末班交通留出缓冲","只查询规划，不把候选信息视为已预订"]};
}

export const assessTripRisks:RuntimeSkill={
 name:"assess-trip-risks",label:"旅行风险与准备",phase:"prepare",description:"根据同行人员、健康或行动限制、目的地和天气形成风险约束。",
 provenance:{source:"Coze deep-travel-planner public feature summary + SkillHub travelassistant public feature summary",pattern:"traveler-aware risk checks, pacing, weather and preparation; original implementation"},
 instructions:"使用 riskAssessment 调整节奏、交通和提醒。只收集规划所必需的敏感信息，不索取病历；健康内容只作一般旅行提醒，不诊断。每天留出交通缓冲和雨天/闭馆替代项；长辈或儿童同行时减少连续步行。",
 supports:intent=>intent==="new_trip"||intent==="revise_trip"||intent==="answer_trip",
 async run(context:SkillContext){const started=Date.now();if(!context.destination)return{trace:{name:this.name,label:this.label,status:"warning",detail:"目的地未确定，先保留通用风险检查",code:"destination missing",durationMs:Date.now()-started}};const result=assess(context.input,context.destination);return{context:{toolResults:{...context.toolResults,riskAssessment:result}},trace:{name:this.name,label:this.label,status:"completed",detail:`已识别 ${result.flags.length} 项人员与目的地风险约束`,code:`risk flags: ${result.flags.length}`,durationMs:Date.now()-started}}}
};
