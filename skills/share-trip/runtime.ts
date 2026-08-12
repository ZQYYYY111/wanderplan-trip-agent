import type { RuntimeSkill } from "../runtime-types";

export const shareTrip: RuntimeSkill = {
  name:"share-trip", label:"生成只读分享", phase:"validate",
  description:"由服务端创建脱敏只读链接，不允许模型生成访问凭证。",
  instructions:"分享令牌和编辑凭证只能由服务端生成。隐藏订单、支付、证件和私人备注；好友默认只读。",
  supports:()=>false,
  async run(){return {trace:{name:this.name,label:this.label,status:"completed",detail:"已创建脱敏只读视图",code:"server-owned token"}}}
};
