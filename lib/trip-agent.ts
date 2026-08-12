import { callBailianJson, type BailianUsage } from "./bailian";
import type { TripPlan, Trace } from "../app/trip-data";

type RouterResult = {
  intent: "new_trip" | "revise_trip" | "answer_trip" | "clarify";
  destination: string | null;
  days: number | null;
  startDate: string | null;
  travelers: number | null;
  budget: number | null;
  skills: string[];
};

type ModelResult = {
  message: string;
  trip: TripPlan | null;
  trace: Trace[];
  needsClarification?: boolean;
};

export type AgentResult = ModelResult & { usage: BailianUsage[]; intent: RouterResult["intent"] };

const SKILLS = ["collect-trip-needs", "research-destination", "compose-itinerary", "revise-itinerary", "validate-itinerary", "share-trip"];

const routerPrompt = `你是对话式出行规划智能体的意图路由器。只返回 JSON。
当前日期为 ${new Date().toISOString().slice(0, 10)}。
intent 只能是 new_trip、revise_trip、answer_trip、clarify。
- 用户想规划另一个目的地或从头规划：new_trip
- 用户要求修改当前行程：revise_trip
- 用户询问当前行程：answer_trip
- 完全无法判断旅行意图：clarify
忠实提取 destination、days、startDate、travelers、budget；未知填 null。中文地名保持中文，绝不翻译成其他城市。
skills 只能从 ${SKILLS.join(", ")} 中选择。`;

const plannerPrompt = `你是“漫游策”旅行规划智能体。你通过成熟 Skill 工作流生成可修改、可验证的结构化行程。

必须遵守：
1. 只输出 JSON，不输出 Markdown。
2. new_trip 时生成 1-7 天行程；信息不足但仍可合理规划时显式记录 assumptions，不要反复追问。
3. revise_trip 时保留无关日期和活动的稳定 id，只修改最小影响范围，并将 version 加 1。
4. 每天安排 2-5 个主要活动，时间必须递增，预留现实交通和休息时间。
5. 不得声称已预订，不得捏造实时余票。动态信息无法确认时写入 notices。
6. 总预算是人民币整数；活动 cost 是人均或全程估算的人民币整数，保持口径一致。
7. message 用简洁自然的中文说明做了什么，或回答用户问题。
8. trace 展示实际使用的 Skill，不展示内部思维。每项为 name、detail、code；name 只能来自指定 Skill。
9. 若只是回答问题且无需修改，trip 返回原行程，version 不变。

TripPlan 必须包含：
id, shareToken, title, destination, dates, travelers, budget, version, days, notices, assumptions, sources。
day 必须包含 date, weekday, theme, area, weather, activities。
activity 必须包含 id, time(HH:MM), title, detail, tag, cost。
source 必须包含 label, url, retrievedAt；没有可信链接时 sources 可为空，禁止编造 URL。

输出格式：{"message":"...","trip":{...},"trace":[{"name":"...","detail":"...","code":"..."}],"needsClarification":false}`;

async function getWeather(destination: string | null, startDate: string | null) {
  if (!destination) return null;
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=zh&format=json`, { signal: AbortSignal.timeout(8_000) });
    if (!geoRes.ok) return null;
    const geo = await geoRes.json() as { results?: Array<{ name:string; country:string; latitude:number; longitude:number; timezone:string }> };
    const place = geo.results?.[0]; if (!place) return null;
    const forecastRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`, { signal: AbortSignal.timeout(8_000) });
    if (!forecastRes.ok) return null;
    const forecast = await forecastRes.json() as Record<string, unknown>;
    return { provider:"Open-Meteo", place, requestedStartDate:startDate, retrievedAt:new Date().toISOString(), forecast };
  } catch { return null; }
}

function normalizeTrip(raw: TripPlan, current: TripPlan | null, intent: RouterResult["intent"]): TripPlan {
  const now = Date.now().toString(36);
  const trip: TripPlan = {
    ...raw,
    id: raw.id || current?.id || `trip-${now}`,
    shareToken: raw.shareToken || current?.shareToken || crypto.randomUUID().slice(0, 12),
    version: Number.isInteger(raw.version) ? raw.version : (current?.version || 0) + 1,
    budget: Math.max(0, Math.round(Number(raw.budget) || 0)),
    notices: Array.isArray(raw.notices) ? raw.notices.slice(0, 8) : [],
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions.slice(0, 8) : [],
    sources: Array.isArray(raw.sources) ? raw.sources.filter(s => s?.url && /^https?:\/\//.test(s.url)).slice(0, 10) : [],
    days: Array.isArray(raw.days) ? raw.days.slice(0, 7) : [],
  };
  if (intent === "revise_trip" && current && trip.version <= current.version) trip.version = current.version + 1;
  trip.days.forEach((day, di) => {
    day.activities = Array.isArray(day.activities) ? day.activities.slice(0, 6) : [];
    day.activities.forEach((activity, ai) => {
      activity.id ||= `d${di + 1}-a${ai + 1}-${now}`;
      activity.cost = Math.max(0, Math.round(Number(activity.cost) || 0));
    });
    day.activities.sort((a, b) => a.time.localeCompare(b.time));
  });
  return trip;
}

function validateTrip(trip: TripPlan): string[] {
  const errors: string[] = [];
  if (!trip.title || !trip.destination || !trip.dates || !trip.travelers) errors.push("行程基础字段不完整");
  if (!trip.days.length) errors.push("行程至少需要一天");
  const ids = new Set<string>();
  trip.days.forEach((day, di) => {
    let last = "00:00";
    if (!day.date || !day.theme || !day.activities.length) errors.push(`第 ${di + 1} 天不完整`);
    day.activities.forEach(activity => {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(activity.time)) errors.push(`${activity.id} 时间格式错误`);
      if (activity.time < last) errors.push(`第 ${di + 1} 天时间顺序错误`);
      if (!activity.id || ids.has(activity.id)) errors.push("活动 ID 缺失或重复");
      ids.add(activity.id); last = activity.time;
    });
  });
  return errors;
}

export async function runTripAgent(input: string, currentTrip: TripPlan | null, history: Array<{role:string;text:string}> = []): Promise<AgentResult> {
  const route = await callBailianJson<RouterResult>({
    model: process.env.BAILIAN_ROUTER_MODEL || "qwen3.6-plus",
    maxTokens: 350,
    temperature: 0,
    messages: [{role:"system",content:routerPrompt},{role:"user",content:JSON.stringify({input,currentDestination:currentTrip?.destination || null,currentVersion:currentTrip?.version || null})}],
  });
  const router = route.data;
  if (!SKILLS.some(skill => router.skills?.includes(skill))) router.skills = router.intent === "new_trip" ? ["collect-trip-needs","research-destination","compose-itinerary","validate-itinerary"] : ["revise-itinerary","validate-itinerary"];
  const weather = await getWeather(router.destination || currentTrip?.destination || null, router.startDate);
  const request = {
    userInput: input,
    intent: router.intent,
    extractedConstraints: router,
    currentTrip,
    recentConversation: history.slice(-6),
    toolResults: { weather },
    allowedSkills: SKILLS,
  };
  const planned = await callBailianJson<ModelResult>({
    model: process.env.BAILIAN_MODEL || "qwen3.6-plus",
    maxTokens: 6500,
    temperature: 0.15,
    enableSearch: true,
    messages: [{role:"system",content:plannerPrompt},{role:"user",content:JSON.stringify(request)}],
  });
  if (!planned.data.trip) {
    if (router.intent === "clarify") return {...planned.data, usage:[route.usage,planned.usage], intent:router.intent};
    throw new Error("模型未返回可用行程");
  }
  const trip = normalizeTrip(planned.data.trip, currentTrip, router.intent);
  const errors = validateTrip(trip);
  if (errors.length) throw new Error(`模型行程校验失败：${errors.slice(0, 3).join("；")}`);
  const trace = (planned.data.trace || []).filter(item => SKILLS.includes(item.name)).slice(0, 8);
  trace.push({name:"validate-itinerary",detail:"服务端 Schema、时间顺序与稳定 ID 校验通过",code:`TripPlan v${trip.version} · ${trip.days.length} days`});
  return {...planned.data, trip, trace, usage:[route.usage,planned.usage], intent:router.intent};
}
