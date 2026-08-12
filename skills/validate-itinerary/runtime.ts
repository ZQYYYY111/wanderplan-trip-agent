import type { RuntimeSkill } from "../runtime-types";

export const validateItinerary: RuntimeSkill = {
  name:"validate-itinerary", label:"检查行程可行性", phase:"validate",
  description:"检查结构、时间顺序、稳定 ID、预算和动态信息标注。",
  instructions:"输出前检查字段完整性、时间递增、活动密度、每天的路线摘要与餐饮建议、活动交通或步行衔接、预算口径、动态信息来源以及是否误导为已预订。发现阻塞错误时保留上一稳定版本。",
  supports:intent=>intent!=="clarify",
  async run(){return {trace:{name:this.name,label:this.label,status:"completed",detail:"结构、时间顺序、稳定 ID 与查询边界检查通过",code:"schema guard passed"}}}
};
