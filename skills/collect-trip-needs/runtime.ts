import type { RuntimeSkill } from "../runtime-types";

export const collectTripNeeds: RuntimeSkill = {
  name:"collect-trip-needs", label:"理解旅行需求", phase:"prepare",
  description:"提取日期、人数、预算、节奏和偏好，只追问会改变方案的关键信息。",
  instructions:"提取并遵守目的地、日期、人数、总预算、旅行节奏、兴趣、饮食与行动限制。缺失但不阻碍规划的信息写入 assumptions；不要声称已预订。",
  supports:intent=>intent==="new_trip"||intent==="clarify",
  async run(){return {trace:{name:this.name,label:this.label,status:"completed",detail:"已整理目的地、天数、人数、预算与偏好",code:"constraints normalized"}}}
};
