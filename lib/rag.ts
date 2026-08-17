import {travelKnowledge,TRAVEL_KNOWLEDGE_VERSION,type TravelKnowledgeChunk} from "../knowledge/travel-knowledge.ts";

export type RagHit={id:string;title:string;category:TravelKnowledgeChunk["category"];tags:string[];content:string;score:number};
export type RagResult={version:string;query:string;strategy:"weighted-lexical-bigram";hits:RagHit[]};

function normalize(value:string){return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"")}
function tokens(value:string){
 const clean=normalize(value);const result=new Set<string>();
 for(let index=0;index<clean.length;index++){result.add(clean[index]);if(index<clean.length-1)result.add(clean.slice(index,index+2))}
 for(const word of value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean))result.add(word);
 return result;
}
function overlap(query:Set<string>,value:string){let score=0;for(const token of tokens(value))if(query.has(token))score+=token.length>1?1.8:.15;return score}
function scoreChunk(query:Set<string>,rawQuery:string,chunk:TravelKnowledgeChunk){
 let score=overlap(query,chunk.title)*3+overlap(query,chunk.tags.join(" "))*2.4+overlap(query,chunk.content)*.55;
 for(const destination of chunk.destinations||[])if(rawQuery.includes(destination))score+=9;
 if(chunk.tags.some(tag=>rawQuery.includes(tag)))score+=4;
 return Math.round(score*100)/100;
}

export function retrieveTravelKnowledge(input:string,destination:string|null,limit=5):RagResult{
 const query=[destination,input].filter(Boolean).join(" ").trim();const queryTokens=tokens(query);
 const ranked=travelKnowledge.map(chunk=>({chunk,score:scoreChunk(queryTokens,query,chunk)})).sort((a,b)=>b.score-a.score||a.chunk.id.localeCompare(b.chunk.id));
 const relevant=ranked.filter(item=>item.score>1.2).slice(0,Math.max(1,Math.min(limit,6)));
 const fallback=ranked.filter(item=>["route-neighborhood-clusters","risk-dynamic-facts","budget-envelope"].includes(item.chunk.id)).slice(0,3);
 const selected=relevant.length?relevant:fallback;
 return{version:TRAVEL_KNOWLEDGE_VERSION,query,strategy:"weighted-lexical-bigram",hits:selected.map(({chunk,score})=>({id:chunk.id,title:chunk.title,category:chunk.category,tags:chunk.tags,content:chunk.content,score}))};
}
