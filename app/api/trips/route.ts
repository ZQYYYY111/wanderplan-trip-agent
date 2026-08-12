import {and,eq} from "drizzle-orm";
import {getDb} from "../../../db";
import {trips,tripVersions} from "../../../db/schema";
import type {TripPlan} from "../../trip-data";

async function hash(value:string){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("")}
function safeTrip(trip:TripPlan):TripPlan{return JSON.parse(JSON.stringify(trip)) as TripPlan}

export async function POST(request:Request){try{const {trip,ownerToken}=(await request.json()) as {trip?:TripPlan;ownerToken?:string};if(!trip?.title||!trip.days?.length)return Response.json({error:"行程数据不完整"},{status:400});const db=getDb();const existing=await db.select().from(trips).where(eq(trips.id,trip.id)).limit(1);let shareToken:string;let returnedOwner:string|undefined;let ownerTokenHash:string;
 if(existing[0]){if(!existing[0].ownerTokenHash){returnedOwner=crypto.randomUUID().replaceAll("-","");ownerTokenHash=await hash(returnedOwner)}else{if(!ownerToken||await hash(ownerToken)!==existing[0].ownerTokenHash)return Response.json({error:"没有权限更新这份分享行程，请重新创建副本。"},{status:403});ownerTokenHash=existing[0].ownerTokenHash}if(trip.version<existing[0].version)return Response.json({error:"线上已有更新版本，请刷新后再试。"},{status:409});shareToken=existing[0].shareToken}else{shareToken=crypto.randomUUID().replaceAll("-","");returnedOwner=crypto.randomUUID().replaceAll("-","");ownerTokenHash=await hash(returnedOwner)}
 const data=safeTrip(trip);const values={id:data.id,shareToken,ownerTokenHash,title:data.title,destination:data.destination,dataJson:JSON.stringify(data),version:data.version,updatedAt:new Date().toISOString()};if(existing[0])await db.update(trips).set(values).where(and(eq(trips.id,data.id),eq(trips.version,existing[0].version)));else await db.insert(trips).values(values);await db.insert(tripVersions).values({tripId:data.id,version:data.version,dataJson:JSON.stringify(data)});return Response.json({token:shareToken,ownerToken:returnedOwner},{status:201})}catch(error){return Response.json({error:error instanceof Error?error.message:"保存失败"},{status:500})}}
