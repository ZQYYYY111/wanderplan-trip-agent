# 漫游策项目报告

## 1. 项目定位

漫游策是一个可交流、可修改、可分享的旅行规划 Web Agent。用户输入一句自然语言需求，系统输出每天可执行的时间线、区域路线、交通衔接、美食建议、预算拆分、风险提示、地图搜索链接和需要复核的动态信息。

边界非常明确：只查询和规划，不预订、不占座、不下单、不支付，也不把候选价格或营业状态描述为已确认。

## 2. 用户流程

1. 用户输入“9月带3个朋友去贵州玩3天，预算3000元，喜欢美食”。
2. 意图路由识别为新建行程，并提取目的地、天数、人数和预算。
3. Skill Registry 选择本轮能力，先准备天气、风险、景点和餐饮材料。
4. DeepSeek 生成符合 TripPlan Schema 的完整 JSON。
5. 后端归一化字段，补充高德链接，校验时间、预算和内容边界。
6. 网页显示行程与每个 Skill 的执行记录。
7. 用户可以继续说“每天最多三个活动”“第三天改室内”“预算降1000元”，系统保留未受影响部分并生成差异。
8. 用户生成只读链接，朋友用普通浏览器即可访问，不需要 Codex。

## 3. 架构

```text
Browser
  -> app/trip-studio.tsx
  -> POST /api/agent
  -> lib/trip-agent.ts
       -> lib/llm.ts (DeepSeek OpenAI-compatible API)
       -> lib/skill-registry.ts
            -> skills/*/runtime.ts
            -> Open-Meteo / FlyAI MCP / Amap Web Service
       -> normalize + validate
  -> TripPlan JSON
  -> browser rendering / D1 share storage
```

前端不接触任何模型或地图 Key。所有第三方调用都发生在服务端。

## 4. 模型调用

运行时模型已经从百炼切换为 DeepSeek：

- 接口：`POST {DEEPSEEK_BASE_URL}/chat/completions`
- 默认地址：`https://api.deepseek.com`
- 规划模型：`DEEPSEEK_MODEL=deepseek-chat`
- 路由模型：`DEEPSEEK_ROUTER_MODEL=deepseek-chat`
- 结构化输出：`response_format={"type":"json_object"}`

`lib/llm.ts` 负责服务端 Key、超时、HTTP 错误翻译、JSON 提取和 token 用量归一化。模型返回的实际模型名会显示在开发者面板。

## 5. API 与 Key 填写位置

本地开发：在根目录新建 `.env`，格式参考 `.env.example`。

```bash
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_ROUTER_MODEL=deepseek-chat
AMAP_WEB_SERVICE_KEY=optional-amap-key
FLYAI_API_KEY=optional-flyai-key
FLYAI_MCP_URL=https://flyai.open.fliggy.com/mcp
```

线上部署：通过托管平台的环境变量/Secret 管理界面填写。Key 不能写在源码、前端请求、Git 历史或 `.openai/hosting.json` 中。

## 6. Skill 如何使用

每个 Skill 有三层：

| 层 | 作用 |
| --- | --- |
| `SKILL.md` | 定义触发场景、工作流程、边界和引用规则 |
| `runtime.ts` | 实际执行查询、分析、增强或校验，并产生可观察 trace |
| `skill-registry.ts` | 按意图选择 Skills，再按 prepare / enrich / validate 阶段顺序执行 |

当前 Skills：

| Skill | 作用 | 来源方式 |
| --- | --- | --- |
| collect-trip-needs | 提取人数、日期、预算、节奏与限制 | 原创 |
| assess-trip-risks | 根据长辈、儿童、行动限制、高海拔等调整节奏与准备 | 参考 Coze/SkillHub 的公开能力描述后原创实现 |
| research-destination | Open-Meteo 天气 + 透明搜索入口 | 原创适配 |
| discover-flyai-pois | 获取结构化景点候选，并过滤预订字段 | 合法复用 MIT 许可 FlyAI 的公开 `search-poi` 协议 |
| plan-local-food | 按当天片区、口味和预算规划餐饮 | 参考 SkillHub 公开能力描述后原创实现 |
| compose-itinerary | 生成详细的逐日路线 | 原创 |
| revise-itinerary | 最小影响修改，保留稳定活动 ID | 原创 |
| optimize-map-route | 高德 POI、坐标、距离与耗时增强 | 高德 Web Service 适配 |
| validate-itinerary | 校验结构、时间、预算、来源和预订边界 | 原创确定性校验 |
| share-trip | 创建和读取只读分享记录 | 原创 |

### 为什么不能直接“无许可证挪用”

FlyAI 仓库公开了 MIT License，所以可以复用并保留来源说明。SkillHub 的页面能公开读取 Skill 内容，但页面没有给出允许复制、修改和再发布的许可证；Coze 的完整 Skill 下载还需要注册认证。因此本项目只吸收公开的产品功能和工作流思想，代码、提示和规则均重新实现，不复制隐藏或未授权内容。

## 7. 百炼为什么超时

此前的复杂新建行程会在一次同步 HTTP 请求里串行执行：

```text
意图路由 -> 百炼联网研究 -> 长篇 TripPlan 生成 -> 失败重试 -> 校验修复
```

其中行程 JSON 包含多天、多活动、交通、美食、预算和来源，输出 token 较大；联网研究和规划又使用同一提供商。当任一步接近 12–38 秒的阶段超时，或者累计时间超过托管运行时/浏览器连接窗口，后端会中断，早期前端只看到 `Failed to fetch`。线上复测已证明简单问答成功而复杂规划返回“百炼 API 请求超时”，因此不是 Key 完全失效，而是长链路时延问题。

本次处理：

- 模型运行时切换到已验证可用的 DeepSeek `deepseek-chat`。
- 移除百炼联网搜索这一额外模型请求，天气、FlyAI、高德和透明搜索入口分别处理。
- 路由限制为 8 秒，主规划限制为 30 秒，修复调用限制为 18 秒。
- 所有失败返回中文、可区分的服务端错误，不再只显示原始 `Failed to fetch`。

如果未来仍要稳定支持 7 天以上的超详细行程，下一步应改成异步任务：请求立即返回任务 ID，前端轮询 Skill 进度，彻底摆脱单个 HTTP 请求时限。

## 8. 动态信息和链接策略

DeepSeek API 负责理解与结构化规划，不把模型常识伪装成实时数据。动态信息分三类：

- 已核验：Open-Meteo、FlyAI、高德实际返回的数据。
- 参考：模型的季节性或常识性建议，明确要求出发前复核。
- 搜索入口：代码生成的百度/高德查询链接，方便用户点击继续查证，但不称为证据来源。

## 9. 测试策略

- 构建测试：TypeScript 和服务端 bundle 能通过。
- 单元测试：Key 只从服务端环境变量读取，源码不含真实 Key；DeepSeek、FlyAI、高德适配路径存在。
- Skill 校验：用 `quick_validate.py` 检查所有 `SKILL.md` 的 frontmatter 和命名。
- API 冒烟：用最小 JSON 请求验证 DeepSeek 账户，再用真实旅行请求验证完整 `/api/agent`。
- 部署复测：检查复杂新建行程、继续修改和只读分享链接。

## 10. 后续优化

1. 配置高德和 FlyAI 的生产 Key，减少“待核验”内容。
2. 引入异步任务与进度轮询，支持更长、更详细的规划。
3. 为每个 Skill 记录成功率、耗时、降级原因和输出质量。
4. 用 LangGraph 把当前 Registry 编排变成显式状态图，并增加持久化 checkpointer。
5. 增加自定义域名、SEO 和访问分析，使朋友可直接搜索或访问普通网页。
