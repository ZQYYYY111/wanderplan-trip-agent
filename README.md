# 漫游策：查询与规划型旅行智能体

漫游策是一个可分享的 Web 旅行规划智能体。用户用自然语言提供目的地、日期、人数、预算和偏好，后端调用 DeepSeek API 生成结构化行程，并通过独立 Skills 补充天气、风险、美食、景点候选、地图路线、校验和只读分享。

产品只提供查询和规划，不执行预订、下单、占座或支付。

## 本地运行

```bash
npm install
npm run dev
npm run build
npm test
```

在项目根目录新建 `.env`，不要把真实 Key 提交到 Git：

```bash
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_ROUTER_MODEL=deepseek-chat
AMAP_WEB_SERVICE_KEY=optional-amap-key
FLYAI_API_KEY=optional-flyai-key
FLYAI_MCP_URL=https://flyai.open.fliggy.com/mcp
```

线上部署时，`DEEPSEEK_API_KEY`、`AMAP_WEB_SERVICE_KEY` 和 `FLYAI_API_KEY` 必须配置成服务端 Secret；不要写进前端、源码或 `.openai/hosting.json`。

## 执行流程

```text
用户输入
  -> DeepSeek 意图路由
  -> Skill Registry 选择本轮 Skills
  -> prepare：人员约束、天气、风险、FlyAI POI、美食规则与搜索入口
  -> DeepSeek 生成结构化 TripPlan
  -> normalize：时间、预算、ID、餐饮与地图链接归一化
  -> enrich：高德 POI 与相邻路线增强
  -> validate：结构、时间、预算、来源和非预订边界校验
  -> 网页展示、继续修改、撤销或生成只读分享链接
```

## Skill 编排

| 意图 | 编排 |
| --- | --- |
| 新建行程 | collect-trip-needs → assess-trip-risks → research-destination → discover-flyai-pois → plan-local-food → compose-itinerary → optimize-map-route → validate-itinerary |
| 修改行程 | assess-trip-risks → revise-itinerary → optimize-map-route → validate-itinerary |
| 旅行问答 | assess-trip-risks → research-destination → discover-flyai-pois → plan-local-food → validate-itinerary |
| 分享 | share-trip 由服务端分享接口执行，不让模型生成令牌 |

详细架构、超时原因、Skill 来源和部署说明见 [项目报告](docs/PROJECT_REPORT.md)。
