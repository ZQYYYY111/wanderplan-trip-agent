import type { RuntimeSkill } from "../runtime-types";

export const composeItinerary: RuntimeSkill = {
  name:"compose-itinerary", label:"安排每日路线", phase:"prepare",
  description:"按区域、时间与旅行强度生成结构化每日行程。",
  instructions:"生成 1-7 天 TripPlan。每天保留 2-5 个主要活动，按地理邻近性组织，预留交通、用餐和休息时间。预算口径必须一致，只做查询与规划，禁止执行预订、下单或支付。",
  supports:intent=>intent==="new_trip",
  async run(){return {trace:{name:this.name,label:this.label,status:"completed",detail:"已启用分区游览、节奏控制和预算规划规则",code:"planning policy loaded"}}}
};
