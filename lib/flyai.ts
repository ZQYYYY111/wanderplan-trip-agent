type FlyaiPoiItem={id?:string;name?:string;address?:string;description?:string;category?:string;poiLevel?:number|string;latitude?:number|string;longitude?:number|string;freePoiStatus?:string};
export type FlyaiPoi={id:string;name:string;address:string;description:string;category:string;poiLevel:number|null;latitude:number|null;longitude:number|null;freePoiStatus:string};

function parseMcpPayload(text:string){
  const chunks=text.split(/\r?\n/).map(line=>line.trim()).filter(line=>line.startsWith("data:"));
  const candidate=chunks.length?chunks.at(-1)!.slice(5).trim():text;
  const envelope=JSON.parse(candidate) as {result?:unknown;error?:{message?:string}};
  if(envelope.error)throw new Error(envelope.error.message||"FlyAI MCP 调用失败");
  return envelope.result??envelope;
}
function unwrapResult(result:unknown){if(!result||typeof result!=="object")return result;const content=(result as {content?:Array<{text?:string}>}).content;const text=content?.find(item=>typeof item.text==="string")?.text;if(!text)return result;try{return JSON.parse(text)}catch{return result}}

export async function searchFlyaiPois(cityName:string){
  const apiKey=process.env.FLYAI_API_KEY?.trim();
  if(!apiKey)return {status:"not_configured" as const,items:[] as FlyaiPoi[]};
  const endpoint=process.env.FLYAI_MCP_URL?.trim()||"https://flyai.open.fliggy.com/mcp";
  const body=JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"search_poi",arguments:{cityName}}});
  const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json",accept:"application/json, text/event-stream",authorization:`Bearer ${apiKey}`},body,signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`FlyAI MCP HTTP ${response.status}`);
  const payload=unwrapResult(parseMcpPayload(await response.text())) as {data?:{itemList?:FlyaiPoiItem[]}};
  const items=(payload.data?.itemList||[]).map(item=>({id:String(item.id||""),name:String(item.name||""),address:String(item.address||""),description:String(item.description||""),category:String(item.category||""),poiLevel:Number.isFinite(Number(item.poiLevel))?Number(item.poiLevel):null,latitude:Number.isFinite(Number(item.latitude))?Number(item.latitude):null,longitude:Number.isFinite(Number(item.longitude))?Number(item.longitude):null,freePoiStatus:String(item.freePoiStatus||"")})).filter(item=>item.name).slice(0,12);
  return {status:"verified" as const,items};
}
