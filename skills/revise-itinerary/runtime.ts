import type { RuntimeSkill } from "../runtime-types";

export const reviseItinerary: RuntimeSkill = {
  name:"revise-itinerary", label:"调整现有行程", phase:"prepare",
  description:"用最小影响原则修改行程，并保留未受影响活动的稳定 ID。",
  instructions:"只修改用户要求涉及的最小范围。保留无关天和活动的稳定 id，版本加 1；返回清晰的变更摘要。若修改影响相邻活动，应解释连锁调整。",
  supports:intent=>intent==="revise_trip",
  async run(context){return {trace:{name:this.name,label:this.label,status:"completed",detail:`已锁定当前行程 v${context.currentTrip?.version ?? 0} 的最小修改范围`,code:"minimal-impact edit"}}}
};
