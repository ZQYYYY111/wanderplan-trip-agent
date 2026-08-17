# 漫游策项目报告

## 1. 项目定位

漫游策是一个“查询与规划型”旅行智能体 Web 应用。它面向普通用户和同行朋友，核心目标是把一句自然语言旅行需求转成可阅读、可修改、可分享的结构化行程。

应用明确不做预订能力：不下单、不占座、不支付、不承诺库存或价格。所有动态信息都以查询、建议和待复核的方式呈现。

## 2. 用户体验流程

用户进入网页后，会看到一个对话区、一个行程时间轴和一个规划过程面板。

用户可以输入：

- “9月带3个朋友去贵州玩3天，预算3000元，喜欢美食”
- “行程轻松一点，每天最多3个主要活动”
- “第三天如果下雨，换成室内方案”
- “把总预算降低1000元，但保留核心景点”

系统会根据输入判断是新建行程、修改行程、旅行问答还是澄清需求。生成行程后，用户可以继续对话修改；如果不满意，可以撤销上一轮修改。用户也可以生成只读分享链接，朋友不需要 Codex，也不需要登录开发环境，只要能访问网页链接即可查看。

## 3. 技术架构

```text
Browser
  -> app/trip-studio.tsx
  -> POST /api/agent
  -> lib/trip-agent.ts
  -> lib/skill-registry.ts
  -> skills/*/runtime.ts
  -> lib/bailian.ts / lib/amap.ts / lib/flyai.ts
  -> TripPlan JSON
  -> Browser rendering
```

前端负责输入、状态展示、错误提示、撤销、分享入口和行程可视化。

后端负责调用模型、执行 Skill 编排、调用第三方查询服务、校验结构化行程，并把结果返回前端。

模型层使用百炼 OpenAI 兼容接口：

- `POST {BAILIAN_BASE_URL}/chat/completions`
- `BAILIAN_API_KEY` 放在服务端环境变量中
- 前端永远不接触 key

## 4. 核心代码位置

| 文件 | 作用 |
| --- | --- |
| `app/trip-studio.tsx` | 主交互界面，对话、行程展示、撤销和分享 |
| `app/api/agent/route.ts` | 智能体接口入口，校验请求并调用 `runTripAgent` |
| `lib/trip-agent.ts` | 智能体主流程：路由、Skill 编排、生成、修复、校验 |
| `lib/bailian.ts` | 百炼 API 封装，包含 JSON 输出和联网研究调用 |
| `lib/skill-registry.ts` | Skill 注册表和按阶段执行逻辑 |
| `skills/*/SKILL.md` | 每个 Skill 的设计意图、边界和模型提示说明 |
| `skills/*/runtime.ts` | 每个 Skill 的实际运行时代码 |
| `lib/amap.ts` | 高德 POI 与路线增强 |
| `lib/flyai.ts` | FlyAI POI 查询适配层 |
| `app/api/trips/route.ts` | 只读分享链接的创建和读取 |
| `docs/PROJECT_REPORT.md` | 当前项目说明报告 |

## 5. API 和 Key 填写位置

本地开发使用项目根目录 `.env`。不要提交真实 key。

```bash
BAILIAN_API_KEY=your-bailian-api-key
BAILIAN_BASE_URL=https://llm-zn6q9hwu66if9fdi.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
BAILIAN_MODEL=qwen3.6-plus
BAILIAN_ROUTER_MODEL=qwen3.6-plus
AMAP_WEB_SERVICE_KEY=your-amap-web-service-key
FLYAI_API_KEY=optional-flyai-key
FLYAI_MCP_URL=https://flyai.open.fliggy.com/mcp
```

线上 Sites 部署使用生产环境变量。当前线上已配置：

- `BAILIAN_API_KEY`
- `BAILIAN_BASE_URL`
- `BAILIAN_MODEL`
- `BAILIAN_ROUTER_MODEL`

当前线上未配置：

- `AMAP_WEB_SERVICE_KEY`
- `FLYAI_API_KEY`
- `FLYAI_MCP_URL`

所以线上目前可以调用百炼模型；高德处于“生成地图搜索链接”的降级模式；FlyAI 处于“适配层已接入但没有独立 key”的降级模式。

## 6. Skill 使用和编排逻辑

本项目没有把 Skill 当成单纯的提示词片段，而是拆成三个层次：

| 层次 | 作用 |
| --- | --- |
| `SKILL.md` | 说明这个 Skill 负责什么、不能做什么、如何使用外部能力 |
| `runtime.ts` | 真正执行查询、降级、校验或增强 |
| `skill-registry.ts` | 根据意图选择 Skill，并按阶段执行 |

当前 Skill 分为三个阶段：

| 阶段 | 说明 |
| --- | --- |
| `prepare` | 在模型生成前准备材料，例如天气、联网研究、POI 候选 |
| `enrich` | 在模型生成后补充地图链接、坐标和路线耗时 |
| `validate` | 在返回前检查时间顺序、预算、结构完整性和非预订边界 |

新建行程时的编排是：

```text
collect-trip-needs
  -> research-destination
  -> discover-flyai-pois
  -> compose-itinerary
  -> optimize-map-route
  -> validate-itinerary
```

修改行程时的编排是：

```text
revise-itinerary
  -> optimize-map-route
  -> validate-itinerary
```

这种设计的好处是：模型负责理解和生成，Skill 负责把可复用能力、边界规则和工具调用固定下来。后续要接入新的成熟 Skill，例如更好的餐饮查询、酒店区域分析、地铁换乘策略，只需要增加 Skill 并注册到对应阶段。

## 7. 成熟 Skill 的接入方式

已经接入或预留的成熟能力：

- 百炼 Web Search：用于目的地动态信息查询。
- FlyAI POI：参考 `alibaba-flyai/flyai-skill` 的 `search-poi` 思路，适配为只读景点候选查询。
- 高德地图：用于 POI 搜索、地图链接和路线耗时增强。

Coze 和 SkillHub 上的公开页面可以作为产品思路参考，但不能直接复制隐藏提示词或无许可证内容。更稳妥的接入方式是让 Skill 作者提供可审计的 `SKILL.md`、工具 schema 和许可证，然后把它包装为本项目的 `skills/<name>/runtime.ts`。

## 8. 当前截图问题判断

截图里的错误是：

```text
这次没有改动行程：Failed to fetch
```

我对线上接口做了两类测试：

- 简单问答可以正常返回，说明网页和百炼 key 并不是完全不可用。
- 新建复杂行程会触发连接中断，说明问题集中在复杂规划链路。

最可能原因是：新建行程的联网研究阶段此前调用 `/responses`，而当前百炼兼容地址主要验证通过的是 `/chat/completions`。当 `/responses` 支持不完整或响应过慢时，请求会拖到托管运行时断开，浏览器只能显示 `Failed to fetch`。

本次整理已做两个修正：

- 联网研究改走 `/chat/completions`，并启用搜索参数。
- 联网研究、路由、规划和修复都加入更短的超时，避免浏览器只得到原始网络错误。
- 前端把 `Failed to fetch` 转成中文诊断文案，方便用户区分网络中断和模型错误。

部署后复测结果：

- 简单问答可正常返回。
- 复杂新建行程不再表现为裸 `Failed to fetch`，而是返回明确的服务端错误：`百炼 API 请求超时`。
- 因此当前问题不是 key 完全不可用，而是完整规划在同步请求模式下容易超过托管运行时窗口。根治方式是引入异步任务队列，或切换更快的规划模型。

## 9. 功能清单

当前已具备：

- 自然语言新建行程
- 对话式修改行程
- 撤销上一轮修改
- 每日路线和活动时间轴
- 餐饮建议
- 预算拆分
- 地图搜索链接
- 只读分享链接
- 开发者模式查看 Skill 执行过程
- 查询与规划边界控制

当前降级能力：

- 未配置高德 key 时，只生成高德搜索链接，不显示真实坐标和路线耗时。
- 未配置 FlyAI key 时，FlyAI Skill 会跳过真实 POI 查询，由百炼和地图链接兜底。
- 远期天气只能作为季节性参考，不能承诺具体天气预报。

## 10. 后续优化路线

第一阶段：稳定体验。

- 把复杂规划拆成异步任务：提交请求后先返回任务 ID，前端轮询进度，避免长请求被浏览器或运行时断开。
- 增加“轻量规划”和“详细规划”模式，让用户在速度和细节之间选择。
- 给每个 Skill 增加耗时与失败原因统计。

第二阶段：增强查询质量。

- 配置 `AMAP_WEB_SERVICE_KEY`，启用真实 POI、坐标和相邻路线耗时。
- 配置 `FLYAI_API_KEY`，启用更成熟的景点候选查询。
- 增加美食 Skill，例如按城市、片区、人均、口味、营业时间筛选餐厅。

第三阶段：Agent 工程化。

- 使用 LangGraph 管理状态和流程，把当前 `runTripAgent` 拆成 graph nodes。
- 使用结构化 schema 管理 TripPlan 输出。
- 接入持久化 checkpointer，支持跨设备继续修改同一份行程。

第四阶段：部署和分享。

- 当前链接托管在 `chatgpt.site`，朋友访问不需要 Codex。
- 如果要成为普通可搜索网站，可以绑定自定义域名，并做 SEO 元数据。
- 如果希望国内访问更稳，可以部署到阿里云、腾讯云、Vercel 或自有服务器；如果完全不用外网，同时又坚持只用 API 模型，则内网用户仍需要服务器能访问百炼 API。
