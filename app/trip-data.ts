export type Activity = { id:string; time:string; title:string; detail:string; tag:string; cost:number };
export type TripDay = { date:string; weekday:string; theme:string; area:string; weather:string; activities:Activity[] };
export type TripPlan = { id:string; shareToken:string; title:string; destination:string; dates:string; travelers:string; budget:number; version:number; days:TripDay[]; notices:string[] };

export const demoTrip: TripPlan = {
  id:"trip-demo-kyoto", shareToken:"kyoto-friends", title:"京都 · 慢游秋日", destination:"京都", dates:"10月18日—10月21日", travelers:"2 位朋友", budget:6200, version:3,
  days:[
    { date:"10月18日", weekday:"周日", theme:"初见京都，沿鸭川散步", area:"祇园 · 东山", weather:"晴 18–24℃", activities:[
      {id:"d1-a1",time:"10:30",title:"抵达京都站",detail:"寄存行李，乘地铁前往四条",tag:"交通 · 约25分钟",cost:40},
      {id:"d1-a2",time:"12:00",title:"锦市场午餐",detail:"先逛后吃，避开最拥挤入口",tag:"美食 · 可灵活调整",cost:220},
      {id:"d1-a3",time:"15:00",title:"清水寺与二年坂",detail:"预留 2.5 小时，步行游览东山",tag:"景点 · 建议预约",cost:80},
      {id:"d1-a4",time:"18:30",title:"鸭川晚餐与散步",detail:"先斗町用餐，再沿河步行回酒店",tag:"慢游 · 日落后",cost:380},
    ]},
    { date:"10月19日", weekday:"周一", theme:"岚山的竹影与山色", area:"岚山", weather:"多云 17–22℃", activities:[
      {id:"d2-a1",time:"08:00",title:"JR 前往岚山",detail:"避开人流，约 35 分钟抵达",tag:"交通 · 早出发",cost:55},
      {id:"d2-a2",time:"09:00",title:"竹林小径与天龙寺",detail:"清晨光线更柔和，游览约 2 小时",tag:"景点 · 步行",cost:100},
      {id:"d2-a3",time:"12:00",title:"渡月桥附近午餐",detail:"预留等位时间，选择豆腐料理",tag:"美食",cost:260},
      {id:"d2-a4",time:"14:30",title:"保津川沿岸散步",detail:"轻松自由活动，雨天替换为博物馆",tag:"自然 · 低强度",cost:0},
    ]},
    { date:"10月20日", weekday:"周二", theme:"伏见稻荷与宇治茶香", area:"伏见 · 宇治", weather:"小雨 16–21℃", activities:[
      {id:"d3-a1",time:"08:30",title:"伏见稻荷大社",detail:"走至四辻后折返，避开完整登山强度",tag:"景点 · 约2小时",cost:0},
      {id:"d3-a2",time:"11:30",title:"前往宇治",detail:"JR 奈良线约 25 分钟",tag:"交通",cost:45},
      {id:"d3-a3",time:"12:30",title:"宇治茶午餐",detail:"茶荞麦与抹茶甜点组合",tag:"美食 · 雨天友好",cost:240},
      {id:"d3-a4",time:"14:00",title:"平等院与宇治川",detail:"根据降雨调整室内外游览顺序",tag:"景点 · 弹性",cost:120},
    ]},
    { date:"10月21日", weekday:"周三", theme:"御所晨光，轻松返程", area:"京都御所 · 京都站", weather:"晴 17–23℃", activities:[
      {id:"d4-a1",time:"09:00",title:"京都御所散步",detail:"行李寄存在酒店，轻装游览",tag:"自然 · 免费",cost:0},
      {id:"d4-a2",time:"11:30",title:"京都站午餐",detail:"拉面小路或车站便当",tag:"美食 · 返程便利",cost:180},
      {id:"d4-a3",time:"13:30",title:"取行李并返程",detail:"预留至少 45 分钟到站时间",tag:"交通 · 留有余量",cost:0},
    ]},
  ], notices:["天气与营业信息为演示数据；正式预订前请再次核验。","预算不含往返京都的大交通费用。"]
};

export const baseTrace = [
  {name:"collect-trip-needs",detail:"提取日期、人数、预算、旅行节奏",code:'constraints: { days: 4, pace: "slow" }'},
  {name:"research-destination",detail:"整理区域、天气与景点候选",code:"sources: weather, places, transit"},
  {name:"compose-itinerary",detail:"按地理邻近性编排每日动线",code:"route_score: 0.91"},
  {name:"validate-itinerary",detail:"检查预算、时间与通勤冲突",code:"0 blocking conflicts"},
];

export function applyTravelEdit(trip:TripPlan,input:string):{trip:TripPlan;message:string;skill:string} {
  const next:TripPlan=JSON.parse(JSON.stringify(trip)); next.version+=1;
  const text=input.toLowerCase();
  if(text.includes("预算")&&(text.includes("少")||text.includes("降低")||text.includes("省"))){ next.budget=Math.max(3800,next.budget-800); return {trip:next,message:"已把总预算下调 ¥800，并优先保留核心体验。住宿和餐饮会改为更经济的选择。",skill:"revise-itinerary"}; }
  if(text.includes("轻松")||text.includes("不要太累")){ next.days.forEach(day=>{if(day.activities.length>3)day.activities=day.activities.slice(0,3)}); return {trip:next,message:"已将每天控制在 3 个主要节点，并增加交通和休息余量。",skill:"revise-itinerary"}; }
  if(text.includes("雨")||text.includes("室内")){ const day=next.days[2]; day.weather="小雨 16–21℃"; day.activities[3]={id:"d3-a4",time:"14:00",title:"源氏物语博物馆",detail:"室内参观约 1.5 小时，雨天更从容",tag:"室内 · 雨天方案",cost:120}; return {trip:next,message:"已启用第三天雨天方案，将宇治川长距离散步替换为室内博物馆。",skill:"revise-itinerary"}; }
  if(text.includes("咖啡")||text.includes("下午茶")){ const day=next.days[1]; day.activities.splice(3,0,{id:`d2-new-${next.version}`,time:"14:00",title:"岚山庭院咖啡",detail:"留出 60 分钟休息与下午茶",tag:"咖啡 · 新增",cost:160}); return {trip:next,message:"已在第二天下午加入庭院咖啡，并把沿河散步顺延 30 分钟。",skill:"revise-itinerary"}; }
  next.notices=[`待确认的新偏好：${input}`, ...next.notices]; return {trip:next,message:"我已记录这个偏好。当前演示编排器会把它加入待确认项，接入实时模型后可继续自动重排行程。",skill:"collect-trip-needs"};
}
