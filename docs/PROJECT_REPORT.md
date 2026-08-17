# 漫游策：旅行规划智能体项目报告

版本：2026-08-17

项目形态：可分享 Web 应用

产品边界：只查询和规划，不执行预订、下单、占座或支付

## 1. 项目摘要

漫游策是一个可对话、可修改、可撤销、可分享的旅行规划智能体。用户只需描述目的地、日期、人数、预算、节奏和兴趣，系统便会生成结构化的逐日行程，包括游览顺序、片区衔接、交通说明、活动时长、美食路线、预算拆分、风险提醒、地图链接和动态信息搜索入口。

项目采用“DeepSeek API + Skill Registry + 轻量 RAG + 旅行数据工具”的组合架构：

- DeepSeek 负责意图理解、结构化生成和自然语言修改。
- Skills 固化需求收集、风险、美食、路线、校验、分享等可复用流程。
- RAG 从版本化旅行知识库检索适用的规划原则，再注入模型上下文。
- Open-Meteo、FlyAI 和高德地图分别提供天气、POI 和路线能力。
- D1 保存只读分享版本，朋友使用普通浏览器即可查看，不需要 Codex。

## 2. 项目目标与非目标

### 2.1 目标

1. 把自然语言需求转换为可以直接执行的逐日行程。
2. 支持“少走路”“预算降低”“雨天改室内”等连续对话修改。
3. 让用户能看见本轮启用了哪些 Skills、检索了哪些知识、哪些能力发生了降级。
4. 提供普通网页和只读分享链接，让朋友无需开发工具即可体验。
5. 保持模型和第三方 API Key 在服务端，避免前端泄露。

### 2.2 非目标

- 不完成机票、酒店、门票或餐厅预订。
- 不提交订单、不占座、不收款。
- 不保证模型生成的票价、营业时间或库存是实时事实。
- 不提供医疗诊断、法律判断或绝对安全保证。

## 3. 典型用户场景

### 3.1 新建行程

> 10 月带父母去成都 3 天，预算 5000 元，少走路，喜欢川菜和茶馆。

系统提取人员、天数、预算和偏好，检索长辈友好、少步行、预算和餐饮原则，查询天气与 POI，然后输出完整三日计划。

### 3.2 局部修改

> 把第二天改得轻松一点，最多 3 个主要活动，保留美食安排。

系统识别为修改意图，只返回受影响天的结构化补丁。服务端合并补丁并保留其他天及未修改活动的稳定 ID，避免每次重写整份行程。

### 3.3 雨天替代

> 第三天如果下雨，换成同片区室内方案。

RAG 检索“雨天替代方案”，模型只修改第三天，并同步检查交通、预算和营业状态是否需要复核。

### 3.4 好友分享

用户点击“分享行程”，服务端将当前版本写入 D1 并生成只读 token。朋友打开 `/share/{token}` 即可查看，无法覆盖原作者的版本。

## 4. 总体架构

```text
普通浏览器
  -> React / Vinext 前端
  -> POST /api/agent
  -> Trip Agent Orchestrator
       -> 确定性意图与约束解析（不调用模型）
       -> Skill Registry
            -> 需求与风险 Skills
            -> RAG 旅行知识检索
            -> Open-Meteo 天气
            -> FlyAI POI（可选）
            -> 美食规划 Skill
       -> DeepSeek TripPlan 生成或局部补丁
       -> 高德地点与路线增强（可选）
       -> 确定性校验
  -> TripPlan JSON
  -> 前端时间轴 / 修改记录 / Skill Trace
  -> D1 只读分享
```

### 4.1 前端

`app/trip-studio.tsx` 负责：

- 对话输入和错误提示。
- 行程天数标签、活动时间轴、预算构成和餐饮路线展示。
- 对话修改、撤销上一轮修改。
- 分享链接创建。
- 普通模式与开发者模式。
- Skill 名称、执行状态、耗时和降级原因显示。

### 4.2 API 层

- `POST /api/agent`：旅行智能体入口，限制输入长度并进行简单限流。
- `POST /api/trips`：创建或更新只读分享版本。
- `GET /api/trips?token=...`：读取分享行程。

### 4.3 Agent 编排层

`lib/trip-agent.ts` 负责：

1. 路由意图。
2. 选择 Skills。
3. 执行 prepare 阶段。
4. 调用 DeepSeek 生成行程或修改补丁。
5. 归一化 TripPlan。
6. 执行地图增强。
7. 校验并返回行程、变更和 trace。

## 5. 模型层

项目只使用 API 模型，不运行本地模型。

| 配置 | 作用 | 默认值 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 服务端鉴权 Secret | 必填 |
| `DEEPSEEK_BASE_URL` | OpenAI 兼容地址 | `https://api.ofox.ai/v1` |
| `DEEPSEEK_MODEL` | 行程规划模型 | `deepseek/deepseek-v4-flash` |
| `DEEPSEEK_ROUTER_MODEL` | 兼容保留，当前默认路由不调用模型 | `deepseek/deepseek-v4-flash` |

`lib/llm.ts` 提供统一封装：

- 调用 `/chat/completions`。
- 使用 `response_format: json_object`。
- 当兼容平台不支持 `response_format` 时自动回退到纯提示词 JSON 模式。
- 当首轮内容不是合法 JSON 时，先提取平衡 JSON 对象，再进行一次低温度 JSON 修复请求。
- 处理超时、鉴权、余额和限流错误。
- 清理 Markdown fence 和思考标签。
- 对少量常见 JSON 分隔符错误进行安全修复。
- 返回模型名和 token 用量。

生产代码和浏览器永远不包含 Key。

## 6. Skill 系统

### 6.1 Skill 结构

每个 Skill 由以下部分组成：

```text
skills/<name>/
  SKILL.md             触发条件、流程和边界
  agents/openai.yaml   UI 元信息
  references/*         按需加载的详细规则
  runtime.ts           应用内实际运行代码
```

Skill 并非只是提示词。`runtime.ts` 可以调用工具、执行检索、生成降级结果或运行校验；每次执行都会返回 trace。

### 6.2 当前 Skills

| Skill | 阶段 | 核心作用 |
| --- | --- | --- |
| collect-trip-needs | prepare | 提取目的地、日期、人数、预算、节奏和限制 |
| assess-trip-risks | prepare | 把长辈、儿童、高海拔、行动限制转成规划约束 |
| retrieve-travel-knowledge | prepare | RAG 检索适用的旅行规划知识 |
| research-destination | prepare | 查询近七日天气并生成透明搜索入口 |
| discover-flyai-pois | prepare | 查询只读 POI 候选并过滤预订字段 |
| plan-local-food | prepare | 按片区、口味、忌口和预算规划餐饮 |
| compose-itinerary | prepare | 加载详细逐日行程生成规则 |
| revise-itinerary | prepare | 加载最小影响修改规则 |
| optimize-map-route | enrich | 补充高德 POI、坐标、距离和耗时 |
| validate-itinerary | validate | 校验结构、顺序、预算和内容边界 |
| share-trip | 独立 API | 创建和读取只读分享版本 |

### 6.3 编排

新建行程：

```text
collect-trip-needs
  -> assess-trip-risks
  -> retrieve-travel-knowledge
  -> research-destination
  -> discover-flyai-pois
  -> plan-local-food
  -> compose-itinerary
  -> optimize-map-route
  -> validate-itinerary
```

修改行程：

```text
assess-trip-risks
  -> retrieve-travel-knowledge
  -> revise-itinerary
  -> optimize-map-route
  -> validate-itinerary
```

## 7. RAG 设计

### 7.1 为什么加入 RAG

仅依赖模型提示词会出现规划风格不稳定、相同限制处理不一致、上下文越来越长等问题。RAG 将可复用的旅行规则放入知识库，每轮只检索相关部分，使模型更稳定地处理长辈、预算、餐饮、雨天、高海拔和无障碍需求。

### 7.2 当前实现

- 知识库：`knowledge/travel-knowledge.ts`。
- 检索器：`lib/rag.ts`。
- 编排 Skill：`skills/retrieve-travel-knowledge`。
- 知识库版本：`2026-08-17.1`。
- 当前知识条目：13 条。
- 每次最多返回 5 条，硬上限 6 条。

知识条目包含：

- 稳定 ID。
- 标题和分类。
- 标签及可选目的地。
- 原创规划规则内容。

### 7.3 检索算法

当前采用加权词法与中文双字片段检索：

1. 合并目的地与用户请求。
2. 对中英文、数字进行标准化。
3. 生成单字、双字和词级 token。
4. 分别计算标题、标签、内容和目的地命中分。
5. 对完整标签和目的地精确匹配加权。
6. 排序、设定相关性阈值并截取 Top-K。

标题权重大于标签，标签权重大于正文；目的地精确匹配获得额外加分。

### 7.4 为什么暂不使用向量数据库

DeepSeek 当前在本项目中承担行程生成与结构化修复；意图路由使用确定性字段解析，项目没有独立 Embedding API。为了坚持“只用 API 模型、不运行本地模型”，同时控制同步请求时延，第一版 RAG 不在本地运行嵌入模型，也不额外引入向量数据库。

当前方案适合几十至数百条短知识。知识量扩大后，可以升级为：

```text
文档清洗 -> API Embedding -> 向量库 -> 元数据过滤 -> Top-K -> 可选重排 -> DeepSeek
```

向量化可使用独立云端 Embedding API，仍然不需要本地模型。

### 7.5 RAG 与实时数据的边界

RAG 条目是稳定规划原则，不是动态事实：

- 工具实时结果优先于 RAG。
- 用户明确要求优先于通用规则。
- RAG 不证明当前票价、营业时间、天气、库存或限流。
- 内部知识 ID 不写入 `TripPlan.sources`。
- 动态信息无法核验时必须写“待核验”。

## 8. 外部数据能力

### 8.1 Open-Meteo

用于目的地坐标和七日天气数据。超过七日的日期只提供季节性参考，不称为准确预报。

### 8.2 FlyAI

参考 MIT 许可的 `alibaba-flyai/flyai-skill`，适配其 `search-poi` 思路：

- 仅保留名称、地址、分类、描述和坐标。
- 不显示预订、购买或门票下单入口。
- 没有应用自有 Key 时自动降级，不阻塞生成。

### 8.3 高德地图

配置 `AMAP_WEB_SERVICE_KEY` 后可进行地点搜索和相邻活动路线增强；未配置时仍生成可点击的高德搜索链接。

## 9. TripPlan 数据模型

核心字段：

```text
TripPlan
  id / version
  title / destination / dates / travelers / budget
  days[]
    date / weekday / theme / area / weather
    routeSummary / meals[]
    activities[]
      id / time / title / detail / tag / cost
      duration / transport / food / tips / mapUrl
      location / routeFromPrevious
  notices[] / assumptions[] / sources[] / budgetBreakdown[]
```

服务端归一化会：

- 将时间修正为 `HH:MM`。
- 限制最多七天、每天最多六个节点。
- 补全活动 ID、时长、交通、提示和地图链接。
- 对成本取非负整数。
- 去重来源。
- 检查预算拆分不超过总预算。

## 10. 对话修改机制

新建行程要求模型返回完整 TripPlan。修改行程则返回局部 Patch：

```json
{
  "message": "修改摘要",
  "patch": {
    "budget": 4500,
    "dayChanges": [
      { "dayNumber": 2, "day": "完整的修改后第二天" }
    ]
  }
}
```

服务端只替换受影响天，并保留其他天和活动 ID。这样能：

- 缩短输出。
- 减少 JSON 出错概率。
- 提升修改速度。
- 生成可解释的前后差异。
- 支持撤销上一轮修改。

## 11. 动态信息、来源与搜索链接

系统把信息分为三类：

| 类型 | 示例 | 展示规则 |
| --- | --- | --- |
| 已查询 | Open-Meteo、FlyAI、高德返回值 | 标明工具和查询时间 |
| 规划参考 | RAG 原则、模型季节性建议 | 明确为参考或假设 |
| 搜索入口 | 百度/高德搜索 URL | 便于继续查证，不称为证据 |

模型不得自行编造来源 URL。预订平台页面也只能用于查询候选，不能声称已完成交易。

## 12. 安全设计

- Key 只存储在 `.env.local` 或 Sites Secret。
- `.env*` 被 Git 忽略，`.env.example` 只包含占位符。
- 浏览器请求不携带模型、FlyAI 或高德 Key。
- Agent 输入限制为 1–800 字。
- API 提供基础 IP 频率限制。
- 分享 token 和 owner token 不允许模型生成。
- 分享页面只读，写入需要 owner token。
- 工具调用失败时降级，不伪造成功结果。

已经在聊天中公开过的 Key 应当作废并重新生成。

## 13. 错误与降级策略

| 场景 | 处理 |
| --- | --- |
| DeepSeek 未配置 | 返回明确中文错误 |
| DeepSeek 401 / 402 / 429 | 分别提示权限、余额或限流 |
| 模型超时 | 保留上一稳定行程并提示重试 |
| JSON 小错误 | 进行受限的安全格式修复 |
| 天气超出七日 | 降级为季节性参考 |
| FlyAI 未配置 | 跳过 POI 查询，不阻塞规划 |
| 高德未配置 | 保留地图搜索链接 |
| RAG 无高相关结果 | 回退到路线、预算和动态事实通用原则 |
| 修改校验失败 | 不覆盖上一稳定版本 |

## 14. 百炼超时分析与模型迁移

旧链路在一个同步请求中串行执行意图路由、百炼联网研究、长篇 TripPlan 生成和可能的修复。复杂行程输出大，累计时间容易超过托管运行时或浏览器连接窗口，因此简单问答可成功，复杂新建行程则出现百炼超时或 `Failed to fetch`。这说明问题主要是链路时延，不是 Key 完全失效。

处理措施：

- 生成切换为 DeepSeek API，路由改为确定性解析以减少一次串行模型调用。
- 移除额外的百炼联网模型调用。
- 将实时查询拆分给天气、FlyAI 和高德工具。
- 为模型阶段设置独立超时。
- 修改操作改为局部补丁。
- 前端显示中文错误而不是裸网络异常。

## 15. 测试结果

### 15.1 自动测试

- 项目构建：通过。
- ESLint：通过。
- 自动测试：9/9 通过。
- 新 RAG Skill 结构校验：通过。

自动测试覆盖：

- DeepSeek Key 只在服务端读取。
- FlyAI 和高德适配路径存在且不包含硬编码 Key。
- 首页和分享页能够渲染。
- 空输入在模型调用前被拒绝。
- 长辈 + 美食查询命中正确 RAG 条目。
- 雨天请求命中室内替代原则。
- 拉萨请求命中高海拔原则。

### 15.2 真实 DeepSeek 测试

新建成都三日长辈友好行程：

- 请求成功。
- 实际返回模型：`deepseek-v4-flash`。
- 总耗时约 29.9 秒。
- 生成 3 天、12 个计划节点。
- RAG 检索 5 条相关原则。
- 完整执行 9 个 Skills。
- 首日包含午餐、茶馆和晚餐的片区、菜品和人均预算。

此前的局部修改测试约 9.5 秒完成，行程版本从 v1 更新到 v2。

## 16. 部署与好友使用

项目使用 Sites 托管，构建产物兼容 Cloudflare Worker。生产环境变量通过 Sites 管理，D1 作为只读分享数据存储。

朋友不需要 Codex，也不需要 API Key。访问者只需：

1. 用普通浏览器打开主站。
2. 输入旅行需求并生成计划。
3. 继续对话修改。
4. 点击分享，复制只读链接给同行者。

如果绑定自定义域名并开放公共访问，网站可以成为普通互联网 Web 应用；搜索引擎能否收录还取决于域名、访问策略、SEO 元数据和站点可抓取性。

## 17. 当前限制

1. 复杂新行程仍是同步请求，约 20–35 秒。
2. 未配置 FlyAI 和高德生产 Key 时，部分信息处于降级模式。
3. 当前 RAG 是词法检索，适合中小型知识库，不适合海量语义文档。
4. 分享是只读版本，不支持多人协作编辑或评论。
5. 动态价格和营业状态仍需用户出发前复核。
6. 没有执行任何预订能力。

## 18. 后续优化路线

### 阶段一：稳定性

- 把复杂规划改成异步任务和进度轮询。
- 为每个 Skill 记录耗时、成功率和降级原因。
- 增加生成中断后的断点恢复。

### 阶段二：数据质量

- 配置应用自有 FlyAI 和高德 Key。
- 增加官方文旅、交通和景区公告数据源。
- 为来源增加有效期和事实级引用。

### 阶段三：向量 RAG

- 将原创与授权文档分块并建立元数据。
- 使用云端 Embedding API 生成向量。
- 接入向量数据库与混合检索。
- 加入重排、引用、知识版本回滚和离线评测。

### 阶段四：Agent 工程化

- 使用 LangGraph 将当前 Registry 变成显式状态图。
- 增加持久化 checkpointer 和跨设备会话。
- 为行程质量建立自动评测集。

### 阶段五：产品化

- 自定义域名和 SEO。
- 用户账户、私人行程库和多人协作。
- 访问分析、成本控制和滥用防护。

## 19. 许可证与第三方 Skill 原则

- FlyAI 仓库明确为 MIT License，可在遵守许可和保留声明的前提下复用公开协议。
- SkillHub 旅游助手没有声明允许复制再发布的许可证，因此只参考公开功能，未复制其内容实现。
- Coze 页面完整 Skill 需要认证下载，因此只参考公开能力描述，没有绕过认证。
- RAG 知识库内容为本项目原创规划规则，未抓取或复制第三方攻略正文。

## 20. 关键代码位置

| 文件 | 作用 |
| --- | --- |
| `app/trip-studio.tsx` | 主网页、对话、行程、trace 和分享 UI |
| `app/api/agent/route.ts` | 智能体 API 入口 |
| `app/api/trips/route.ts` | 分享创建和读取 |
| `lib/llm.ts` | DeepSeek API 封装 |
| `lib/trip-agent.ts` | Agent 主流程和局部修改 |
| `lib/skill-registry.ts` | Skill 注册与阶段编排 |
| `lib/rag.ts` | RAG 检索算法 |
| `knowledge/travel-knowledge.ts` | 版本化旅行知识库 |
| `lib/flyai.ts` | FlyAI POI 适配 |
| `lib/amap.ts` | 高德地点和路线适配 |
| `skills/*` | 各领域 Skill |
| `tests/rag.test.mjs` | RAG 行为测试 |
| `.env.example` | 环境变量模板 |

## 21. 结论

漫游策已经具备完整的旅行规划 Agent 主链路：API 模型生成、可解释 Skill 编排、RAG 知识增强、天气和地图工具、对话修改、确定性校验、撤销和好友分享。当前实现坚持查询与规划边界，能作为可公开体验的 Web 产品基础。下一阶段最有价值的工作是异步任务、真实高德/FlyAI 数据和云端向量 RAG。
