import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { trips } from "../../../db/schema";
import type { TripPlan } from "../../trip-data";

export async function POST(request:Request){
 try{
  const {trip}=(await request.json()) as {trip?:TripPlan}; if(!trip?.title||!trip.days?.length)return Response.json({error:"行程数据不完整"},{status:400});
  const token=trip.shareToken||crypto.randomUUID().slice(0,12); const db=getDb();
  const existing=await db.select({id:trips.id}).from(trips).where(eq(trips.id,trip.id)).limit(1);
  const values={id:trip.id,shareToken:token,title:trip.title,destination:trip.destination,dataJson:JSON.stringify({...trip,shareToken:token}),version:trip.version,updatedAt:new Date().toISOString()};
  if(existing.length)await db.update(trips).set(values).where(eq(trips.id,trip.id)); else await db.insert(trips).values(values);
  return Response.json({token},{status:201});
 }catch(error){return Response.json({error:error instanceof Error?error.message:"保存失败"},{status:500})}
}
