import { runTripAgent } from "../../../lib/trip-agent";
import type { TripPlan } from "../../trip-data";

const buckets = new Map<string, number[]>();
function allowed(request:Request){
 const ip=request.headers.get("cf-connecting-ip")||request.headers.get("x-forwarded-for")||"local";
 const now=Date.now(); const recent=(buckets.get(ip)||[]).filter(t=>now-t<60_000);
 if(recent.length>=8)return false; recent.push(now); buckets.set(ip,recent); return true;
}

export async function POST(request:Request){
 if(!allowed(request))return Response.json({error:"请求太频繁，请稍后再试。"},{status:429});
 try{
  const payload=(await request.json()) as {input?:string;trip?:TripPlan|null;history?:Array<{role:string;text:string}>};
  const input=payload.input?.trim(); if(!input||input.length>800)return Response.json({error:"请输入 1–800 字的旅行需求。"},{status:400});
  const result=await runTripAgent(input,payload.trip||null,payload.history||[]);
  return Response.json(result);
 }catch(error){
  const message=error instanceof Error?error.message:"智能体暂时不可用";
  console.error("trip-agent-error",message);
  return Response.json({error:message},{status:502});
 }
}
