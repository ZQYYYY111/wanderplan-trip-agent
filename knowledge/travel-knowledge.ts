export type TravelKnowledgeChunk={
 id:string;
 title:string;
 category:"route"|"pace"|"food"|"budget"|"weather"|"risk"|"family"|"accessibility";
 tags:string[];
 destinations?:string[];
 content:string;
};

export const TRAVEL_KNOWLEDGE_VERSION="2026-08-17.1";

export const travelKnowledge:TravelKnowledgeChunk[]=[
 {id:"route-neighborhood-clusters",title:"按片区聚类路线",category:"route",tags:["路线","顺路","片区","少折返","交通"],content:"每天先确定一个主片区，再用步行或一段公共交通串联相邻地点。跨片区移动通常不超过一次；若必须跨区，把长距离移动放在午餐、午休或返程前后，并给出缓冲时间。"},
 {id:"route-arrival-departure-buffer",title:"抵达和返程日留缓冲",category:"route",tags:["抵达","返程","机场","高铁","行李","缓冲"],content:"抵达日只安排住宿附近或交通枢纽周边的低承诺活动。返程日前半天优先安排可随时结束的活动，并为取行李、拥堵、安检和站内步行留出独立缓冲。"},
 {id:"pace-senior-friendly",title:"长辈友好节奏",category:"pace",tags:["父母","老人","长辈","少走路","午休","轻松"],content:"长辈同行时每天设置二至三个主要游览锚点，连续步行约六十至九十分钟后安排坐下休息。优先电梯、观光车或短程出租车，避免连续台阶、陡坡和晚间赶路。"},
 {id:"pace-light-itinerary",title:"轻松行程密度",category:"pace",tags:["轻松","慢游","不赶","休息","活动数量"],content:"轻松模式每天保留二至三个主要活动；用餐、交通和自由散步作为辅助节点。相邻主要活动之间至少留出二十至四十分钟弹性，不用未核验的精确分钟制造虚假确定性。"},
 {id:"food-route-integration",title:"餐饮与路线同片区",category:"food",tags:["美食","餐厅","小吃","午餐","晚餐","不折返"],content:"餐饮应服务于当天路线：午餐放在上午终点附近，晚餐放在下午终点或住宿附近。推荐代表菜、餐饮类型、片区和人均区间；具体店铺未核验时只作为候选并附搜索入口。"},
 {id:"food-dietary-safety",title:"忌口和过敏复核",category:"food",tags:["过敏","忌口","素食","清真","不辣","儿童餐"],content:"存在过敏、宗教饮食或明确忌口时，每一餐都要重复关键限制，并提示现场确认配料、共用厨具和交叉接触。模型不得根据菜名推断一定安全。"},
 {id:"budget-envelope",title:"信封式预算拆分",category:"budget",tags:["预算","省钱","费用","人均","机动"],content:"先区分往返大交通、住宿、当地交通、餐饮、门票活动和机动金。至少保留总预算的百分之五至十作为机动；动态价格未查询时使用区间并说明口径，预算拆分不得超过总预算。"},
 {id:"budget-low-cost-priority",title:"低预算优先级",category:"budget",tags:["低预算","便宜","省钱","核心景点","免费"],content:"预算紧张时先保留用户明确的核心景点，再减少跨城移动、收费体验和高溢价打卡店。用公共交通、免费街区和同片区组合降低成本，而不是压缩必要餐饮和安全缓冲。"},
 {id:"weather-rain-alternative",title:"雨天替代方案",category:"weather",tags:["下雨","雨天","室内","天气","备选"],content:"每个受天气影响明显的日程至少准备一个同片区室内替代项。替换时同时检查交通、开放时间和预算影响；远期日期只能给季节性建议，七日内预报也需在出发前再次复核。"},
 {id:"risk-high-altitude",title:"高海拔旅行边界",category:"risk",tags:["高原","高海拔","西藏","拉萨","青海","稻城","香格里拉"],destinations:["西藏","拉萨","青海","稻城","香格里拉"],content:"高海拔目的地首日应降低运动量、减少饮酒并避免密集跨城。存在基础疾病、近期手术或明显不适时应寻求专业医疗建议；旅行规划只能提供一般提醒，不能诊断或保证安全。"},
 {id:"family-child-buffers",title:"亲子旅行缓冲",category:"family",tags:["亲子","儿童","孩子","宝宝","厕所","午睡"],content:"儿童同行时缩短连续参观时长，在午餐、厕所、补水和午睡附近安排可中断节点。每天准备一个提前返程选项，避免把需要长时间排队的项目连续安排。"},
 {id:"accessibility-route-check",title:"行动限制与无障碍核验",category:"accessibility",tags:["轮椅","行动不便","膝盖","台阶","无障碍","少走路"],content:"行动受限时，不只看直线距离，还要核验台阶、坡度、电梯、无障碍入口和车辆落客点。工具无法核验时明确标注待确认，并提供出租车或缩短路线的替代方案。"},
 {id:"risk-dynamic-facts",title:"动态事实分级",category:"risk",tags:["开放时间","票价","限流","预约","闭馆","来源"],content:"天气、票价、开放时间、限流、临时闭馆和交通班次属于动态事实。工具已返回的数据可标为已查询；模型常识只能标为参考；搜索结果页只能标为搜索入口，不能当作已核验证据。"}
];
