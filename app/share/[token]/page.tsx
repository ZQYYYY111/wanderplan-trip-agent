import Link from "next/link";
import { demoTrip, TripPlan } from "../../trip-data";

export default async function SharedTrip({params}:{params:Promise<{token:string}>}){
 const {token}=await params; let trip:TripPlan|null=token===demoTrip.shareToken?demoTrip:null;
 if(!trip){try{const [{eq},{getDb},{trips}]=await Promise.all([import("drizzle-orm"),import("../../../db"),import("../../../db/schema")]);const rows=await getDb().select().from(trips).where(eq(trips.shareToken,token)).limit(1);if(rows[0])trip=JSON.parse(rows[0].dataJson) as TripPlan}catch{/* local preview may not have D1 */}}
 if(!trip)return <main className="share-shell"><div className="share-wrap"><div className="share-card"><h1>这份行程暂时找不到</h1><p>链接可能已失效，请联系分享者重新创建。</p></div></div></main>;
 return <main className="share-shell"><div className="share-wrap"><Link href="/" className="brand" style={{textDecoration:"none",marginBottom:18}}><div className="brand-mark"><span>⌁</span></div>漫游策</Link><section className="share-hero"><span className="eyebrow" style={{color:"#f6b294"}}>A trip shared with you</span><h1>{trip.title}</h1><p>{trip.dates} · {trip.travelers} · 预计预算 ¥{trip.budget.toLocaleString()}</p></section><section className="share-card">{trip.days.map((day,i)=><div className="share-day" key={day.date}><h2>D{i+1} · {day.theme}</h2><p className="trip-meta">{day.date} · {day.area} · {day.weather}</p>{day.activities.map(a=><div className="share-item" key={a.id}><strong>{a.time}</strong><span>{a.title}</span></div>)}</div>)}</section><div className="notice">这是一份只读分享视图。动态价格、天气和营业信息请在出发前再次核验。</div></div></main>
}
