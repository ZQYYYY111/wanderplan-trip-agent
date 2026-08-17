import type { RuntimeSkill, SkillContext } from "../runtime-types";

function daysFromToday(date:string|null){if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;const today=new Date();today.setHours(0,0,0,0);return Math.round((new Date(`${date}T00:00:00`).getTime()-today.getTime())/86400000)}
async function queryWeather(destination:string|null,startDate:string|null){
 if(!destination)return {status:"unavailable",reason:"未识别目的地",retrievedAt:new Date().toISOString()};
 const offset=daysFromToday(startDate); if(offset!==null&&(offset<0||offset>6))return {status:"out_of_range",reason:"旅行日期超出七日天气预报范围，只能提供季节性规划建议",requestedStartDate:startDate,retrievedAt:new Date().toISOString()};
 try{const geoRes=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=zh&format=json`,{signal:AbortSignal.timeout(8000)});if(!geoRes.ok)throw new Error("geocoding failed");const geo=await geoRes.json() as {results?:Array<{name:string;country:string;latitude:number;longitude:number;timezone:string}>};const place=geo.results?.[0];if(!place)return {status:"unavailable",reason:"未找到目的地坐标",retrievedAt:new Date().toISOString()};const forecastRes=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`,{signal:AbortSignal.timeout(8000)});if(!forecastRes.ok)throw new Error("forecast failed");return {status:startDate?"verified_forecast":"recent_reference",provider:"Open-Meteo",place,requestedStartDate:startDate,retrievedAt:new Date().toISOString(),forecast:await forecastRes.json()}}catch{return {status:"unavailable",reason:"天气服务暂时不可用",retrievedAt:new Date().toISOString()}}
}
function researchWeb(destination:string|null,input:string){
 if(!destination)return {status:"unavailable",summary:"",sources:[]};
 const queries=[
  `${destination} 文旅局 景区 开放时间 限流 公告`,
  `${destination} 公共交通 旅游专线 官方`,
  `${destination} 本地特色美食 老字号 餐饮街区`,
  `${destination} ${/老人|父母|长辈/.test(input)?"老人 旅行 无障碍 风险":"旅行 安全 风险 提示"}`,
 ];
 const sources=queries.map(query=>({url:`https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,query,kind:"search" as const}));
 sources.push({url:`https://www.amap.com/search?query=${encodeURIComponent(`${destination} 景点`)}`,query:`${destination} 景点地图`,kind:"search" as const});
 return {status:"reference_links",summary:"DeepSeek 负责生成规划；动态事实需通过天气、FlyAI、高德或下列搜索入口复核。搜索入口不是已核验事实来源。",sources};
}
export const researchDestination: RuntimeSkill = {
  name:"research-destination", label:"查询目的地信息", phase:"prepare",
  description:"查询目的地天气并要求联网信息带来源和新鲜度。",
  provenance:{source:"Open-Meteo + original search-link adapter",pattern:"verified forecast plus transparent query links"},
  instructions:"使用提供的 weather 与 webResearch 工具结果。实时天气仅在七日范围内称为预报，较远日期只能写季节性参考。webResearch 中 kind=search 的链接只是用户可点击的搜索入口，不得称为已核验依据。价格、营业时间和交通属于动态信息，无法核实时标为待核验。禁止编造 URL。",
  supports:intent=>intent==="new_trip"||intent==="answer_trip",
  async run(context:SkillContext){const started=Date.now();const [weather,webResearch]=await Promise.all([queryWeather(context.destination,context.startDate),Promise.resolve(researchWeb(context.destination,context.input))]);return {context:{toolResults:{...context.toolResults,weather,webResearch}},trace:{name:this.name,label:this.label,status:context.destination?"completed":"warning",detail:`已生成 ${webResearch.sources.length} 个透明搜索入口；${weather.status==="verified_forecast"?"天气预报已核验":weather.status==="out_of_range"?"远期天气已降级为季节性参考":"天气信息按可用范围标注"}`,code:`research: ${webResearch.status} · links: ${webResearch.sources.length} · weather: ${weather.status}`,durationMs:Date.now()-started}}}
};
