import fs from "node:fs";
const file=process.argv[2]; if(!file){console.error("usage: validate_trip.mjs <trip.json>");process.exit(2)}
const trip=JSON.parse(fs.readFileSync(file,"utf8")); const errors=[]; const warnings=[]; const ids=new Set(); let cost=0;
if(!Array.isArray(trip.days)||!trip.days.length)errors.push("trip.days must contain at least one day");
for(const [di,day] of (trip.days||[]).entries()){let last=-1;if(!Array.isArray(day.activities))errors.push(`day ${di+1}: activities must be an array`);if((day.activities||[]).length>5)warnings.push(`day ${di+1}: more than five activity anchors`);for(const a of day.activities||[]){if(!a.id||ids.has(a.id))errors.push(`day ${di+1}: activity id is missing or duplicated`);ids.add(a.id);const m=/^(\d{2}):(\d{2})$/.exec(a.time||"");if(!m)errors.push(`${a.id}: invalid time`);else{const now=+m[1]*60 + +m[2];if(now<last)errors.push(`${a.id}: activities are not chronological`);last=now}if(typeof a.cost!=="number"||a.cost<0)errors.push(`${a.id}: invalid cost`);else cost+=a.cost}}
if(typeof trip.budget==="number"&&cost>trip.budget)warnings.push(`activity cost ${cost} exceeds budget ${trip.budget}`);
console.log(JSON.stringify({valid:errors.length===0,errors,warnings,estimatedActivityCost:cost},null,2));process.exit(errors.length?1:0);
