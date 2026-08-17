# 漫游策：查询与规划型旅行智能体

漫游策是一个可分享的 Web 旅行规划智能体。用户通过对话输入目的地、日期、人数、预算和偏好，系统会调用百炼 API 生成结构化行程，并通过 Skill 编排补充天气、联网来源、景点候选、地图链接、路线校验和只读分享能力。

本项目只提供查询和规划，不执行预订、下单、占座或支付。

## 运行方式

```bash
npm install
npm run dev
npm run build
npm test
```

## API 配置

本地开发在项目根目录创建 `.env`，字段参考 `.env.example`：

```bash
BAILIAN_API_KEY=your-bailian-api-key
BAILIAN_BASE_URL=https://llm-zn6q9hwu66if9fdi.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
BAILIAN_MODEL=qwen3.6-plus
BAILIAN_ROUTER_MODEL=qwen3.6-plus
AMAP_WEB_SERVICE_KEY=your-amap-web-service-key
FLYAI_API_KEY=optional-flyai-key
FLYAI_MCP_URL=https://flyai.open.fliggy.com/mcp
```

线上部署时不要把 key 写入代码或 `.openai/hosting.json`，应通过 Sites 的生产环境变量配置：

- `BAILIAN_API_KEY`：必填，secret
- `BAILIAN_BASE_URL`：必填，普通环境变量
- `BAILIAN_MODEL`：必填，普通环境变量
- `BAILIAN_ROUTER_MODEL`：建议填写，普通环境变量
- `AMAP_WEB_SERVICE_KEY`：可选，secret；填写后会启用真实 POI 与路线耗时
- `FLYAI_API_KEY`：可选，secret；填写后会启用 FlyAI 景点候选
- `FLYAI_MCP_URL`：可选，普通环境变量

## 工作流程

```text
用户需求
  -> 意图路由
  -> Skill Registry 按意图选择 Skills
  -> prepare 阶段查询天气、联网来源和 POI 候选
  -> 百炼模型生成结构化 TripPlan
  -> 后端归一化时间、预算、地图链接和来源
  -> enrich 阶段补充高德地图链接或真实路线
  -> validate 阶段检查结构、时间顺序、预算与非预订边界
  -> 网页展示，并支持继续修改、撤销与只读分享
```

## Skill 编排

| 意图 | 编排 |
| --- | --- |
| 新建行程 | collect-trip-needs -> research-destination -> discover-flyai-pois -> compose-itinerary -> optimize-map-route -> validate-itinerary |
| 修改行程 | revise-itinerary -> optimize-map-route -> validate-itinerary |
| 旅行问答 | research-destination -> discover-flyai-pois |
| 分享 | share-trip 由服务端分享接口执行，不由模型生成令牌 |

更多实现说明见 [项目报告](docs/PROJECT_REPORT.md)。
