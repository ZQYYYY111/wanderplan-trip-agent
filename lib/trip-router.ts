type AgentIntent="new_trip"|"revise_trip"|"answer_trip"|"clarify";
type CurrentTrip={destination?:string}|null;

export type RouterResult={
  intent:AgentIntent;
  destination:string|null;
  days:number|null;
  startDate:string|null;
  travelers:number|null;
  budget:number|null;
};

const chineseDays:Record<string,number>={一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10};

export function routeTripRequest(input:string,currentTrip:CurrentTrip):RouterResult{
  const destinationMatch=input.match(/(?:去|到|前往|游玩)([\u4e00-\u9fa5]{2,12}?)(?=\d|[一二两三四五六七八九十]+天|玩|旅行|旅游|自由行|，|,|。|\s|$)/);
  const numericDays=input.match(/(\d{1,2})\s*天/);
  const namedDays=input.match(/([一二两三四五六七八九十])\s*天/);
  const party=input.match(/(\d{1,2})\s*(?:人|位)/);
  const friends=input.match(/带\s*(\d{1,2})\s*(?:个|位)?朋友/);
  const budget=input.match(/预算(?:为|是|约|大约)?\s*(\d[\d,，]*)\s*元?/);
  const fullDate=input.match(/(20\d{2})[年/-](\d{1,2})[月/-](\d{1,2})/);
  const shortDate=input.match(/(\d{1,2})月(\d{1,2})[日号]?/);
  const startDate=fullDate?`${fullDate[1]}-${fullDate[2].padStart(2,"0")}-${fullDate[3].padStart(2,"0")}`:shortDate?`${new Date().getFullYear()}-${shortDate[1].padStart(2,"0")}-${shortDate[2].padStart(2,"0")}`:null;
  const isRevision=Boolean(currentTrip)&&/(改|换|调整|删除|移除|增加|新增|替换|降低|提高|缩短|延长|轻松|少走|预算|第[一二三四五六七八九十\d]+天)/.test(input);
  const destination=destinationMatch?.[1]||currentTrip?.destination||null;
  const days=numericDays?Number(numericDays[1]):namedDays?(chineseDays[namedDays[1]]||null):null;
  const travelers=party?Number(party[1]):friends?Number(friends[1])+1:/带父母|和父母|陪父母/.test(input)?3:null;
  const parsedBudget=budget?Number(budget[1].replace(/[,，]/g,"")):null;
  const intent:AgentIntent=currentTrip?(isRevision?"revise_trip":"answer_trip"):(destination||days?"new_trip":"clarify");
  return{intent,destination,days,startDate,travelers,budget:parsedBudget};
}
