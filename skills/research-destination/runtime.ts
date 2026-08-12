import type { RuntimeSkill, SkillContext } from "../runtime-types";

function daysFromToday(date:string|null){if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;const today=new Date();today.setHours(0,0,0,0);return Math.round((new Date(`${date}T00:00:00`).getTime()-today.getTime())/86400000)}
async function queryWeather(destination:string|null,startDate:string|null){
 if(!destination)return {status:"unavailable",reason:"未识别目的地",retrievedAt:new Date().toISOString()};
 const offset=daysFromToday(startDate); if(offset!==null&&(offset<0||offset>6))return {status:"out_of_range",reason:"旅行日期超出七日天气预报范围，只能提供季节性规划建议",requestedStartDate:startDate,retrievedAt:new Date().toISOString()};
 try{const geoRes=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=zh&format=json`,{signal:AbortSignal.timeout(8000)});if(!geoRes.ok)throw new Error("geocoding failed");const geo=await geoRes.json() as {results?:Array<{name:string;country:string;latitude:number;longitude:number;timezone:string}>};const place=geo.results?.[0];if(!place)return {status:"unavailable",reason:"未找到目的地坐标",retrievedAt:new Date().toISOString()};const forecastRes=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`,{signal:AbortSignal.timeout(8000)});if(!forecastRes.ok)throw new Error("forecast failed");return {status:startDate?"verified_forecast":"recent_reference",provider:"Open-Meteo",place,requestedStartDate:startDate,retrievedAt:new Date().toISOString(),forecast:await forecastRes.json()}}catch{return {status:"unavailable",reason:"天气服务暂时不可用",retrievedAt:new Date().toISOString()}}
}
export const researchDestination: RuntimeSkill = {
  name:"research-destination", label:"查询目的地信息", phase:"prepare",
  description:"查询目的地天气并要求联网信息带来源和新鲜度。",
  instructions:"使用提供的工具结果。实时天气仅在七日范围内称为预报；较远日期只能写季节性参考。价格、营业时间和交通属于动态信息，无法核实时标为待核验，禁止编造来源 URL。",
  supports:intent=>intent==="new_trip"||intent==="revise_trip"||intent==="answer_trip",
  async run(context:SkillContext){const started=Date.now();const weather=await queryWeather(context.destination,context.startDate);return {context:{toolResults:{...context.toolResults,weather}},trace:{name:this.name,label:this.label,status:"completed",detail:weather.status==="verified_forecast"?"已取得旅行日期范围内的天气预报":weather.status==="recent_reference"?"未提供明确日期，天气仅作近期参考":weather.status==="out_of_range"?"旅行日期超出预报范围，已降级为季节性建议":"天气服务未返回可核验结果",code:`weather: ${weather.status}`,durationMs:Date.now()-started}}}
};
