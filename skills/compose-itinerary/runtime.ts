import type { RuntimeSkill } from "../runtime-types";

export const composeItinerary: RuntimeSkill = {
  name:"compose-itinerary", label:"安排每日路线", phase:"prepare",
  description:"按区域、时间与旅行强度生成结构化每日行程。",
  instructions:"生成 1-7 天 TripPlan。每天通常安排 3-5 个主要活动，按地理邻近性组织，并填写 routeSummary 与 meals。每个活动除标题外必须写清 duration、transport、food（适用时）、tips 和可执行细节；mapUrl 可留空由服务端生成。说明片区之间如何移动、预计时长、招牌菜或餐饮类型、用餐区域与人均预算。预算口径必须一致，只做查询与规划，禁止执行预订、下单或支付。",
  supports:intent=>intent==="new_trip",
  async run(){return {trace:{name:this.name,label:this.label,status:"completed",detail:"已启用分区游览、节奏控制和预算规划规则",code:"planning policy loaded"}}}
};
