export type Activity = { id:string; time:string; title:string; detail:string; tag:string; cost:number };
export type TripDay = { date:string; weekday:string; theme:string; area:string; weather:string; activities:Activity[] };
export type TripSource = { label:string; url:string; retrievedAt:string };
export type Trace = { name:string; detail:string; code:string };
export type TripPlan = { id:string; shareToken:string; title:string; destination:string; dates:string; travelers:string; budget:number; version:number; days:TripDay[]; notices:string[]; assumptions:string[]; sources:TripSource[] };

export const demoTrip: TripPlan = {
  id:"trip-demo-kyoto", shareToken:"kyoto-friends", title:"京都 · 慢游秋日", destination:"京都", dates:"10月18日—10月21日", travelers:"2 位朋友", budget:6200, version:3,
  days:[
    {date:"10月18日",weekday:"周日",theme:"初见京都，沿鸭川散步",area:"祇园 · 东山",weather:"天气待实时查询",activities:[
      {id:"d1-a1",time:"10:30",title:"抵达京都站",detail:"寄存行李，乘地铁前往四条",tag:"交通 · 约25分钟",cost:40},{id:"d1-a2",time:"12:00",title:"锦市场午餐",detail:"先逛后吃，避开最拥挤入口",tag:"美食 · 可灵活调整",cost:220},{id:"d1-a3",time:"15:00",title:"清水寺与二年坂",detail:"预留 2.5 小时，步行游览东山",tag:"景点 · 建议预约",cost:80},{id:"d1-a4",time:"18:30",title:"鸭川晚餐与散步",detail:"先斗町用餐，再沿河步行回酒店",tag:"慢游 · 日落后",cost:380}]},
    {date:"10月19日",weekday:"周一",theme:"岚山的竹影与山色",area:"岚山",weather:"天气待实时查询",activities:[
      {id:"d2-a1",time:"08:00",title:"JR 前往岚山",detail:"避开人流，约 35 分钟抵达",tag:"交通 · 早出发",cost:55},{id:"d2-a2",time:"09:00",title:"竹林小径与天龙寺",detail:"清晨光线更柔和，游览约 2 小时",tag:"景点 · 步行",cost:100},{id:"d2-a3",time:"12:00",title:"渡月桥附近午餐",detail:"预留等位时间，选择豆腐料理",tag:"美食",cost:260},{id:"d2-a4",time:"14:30",title:"保津川沿岸散步",detail:"轻松自由活动，雨天替换为博物馆",tag:"自然 · 低强度",cost:0}]},
    {date:"10月20日",weekday:"周二",theme:"伏见稻荷与宇治茶香",area:"伏见 · 宇治",weather:"天气待实时查询",activities:[
      {id:"d3-a1",time:"08:30",title:"伏见稻荷大社",detail:"走至四辻后折返，避开完整登山强度",tag:"景点 · 约2小时",cost:0},{id:"d3-a2",time:"11:30",title:"前往宇治",detail:"JR 奈良线约 25 分钟",tag:"交通",cost:45},{id:"d3-a3",time:"12:30",title:"宇治茶午餐",detail:"茶荞麦与抹茶甜点组合",tag:"美食 · 雨天友好",cost:240},{id:"d3-a4",time:"14:00",title:"平等院与宇治川",detail:"根据降雨调整室内外游览顺序",tag:"景点 · 弹性",cost:120}]},
    {date:"10月21日",weekday:"周三",theme:"御所晨光，轻松返程",area:"京都御所 · 京都站",weather:"天气待实时查询",activities:[
      {id:"d4-a1",time:"09:00",title:"京都御所散步",detail:"行李寄存在酒店，轻装游览",tag:"自然 · 免费",cost:0},{id:"d4-a2",time:"11:30",title:"京都站午餐",detail:"拉面小路或车站便当",tag:"美食 · 返程便利",cost:180},{id:"d4-a3",time:"13:30",title:"取行李并返程",detail:"预留至少 45 分钟到站时间",tag:"交通 · 留有余量",cost:0}]},
  ],
  notices:["这是初始示例；发送消息后将由百炼 API 重新规划或修改。","动态价格、天气和营业信息请在预订前再次核验。"],
  assumptions:["默认两位成人，偏好慢节奏与当地饮食。"], sources:[]
};

export const baseTrace: Trace[] = [
  {name:"collect-trip-needs",detail:"等待用户提供或修改旅行约束",code:"ready · API mode"},
  {name:"research-destination",detail:"按需调用天气与联网研究能力",code:"tools on demand"},
  {name:"compose-itinerary",detail:"由百炼主模型生成结构化 TripPlan",code:"qwen3.6-plus"},
  {name:"validate-itinerary",detail:"服务端确定性校验后才允许更新",code:"schema guard enabled"},
];
