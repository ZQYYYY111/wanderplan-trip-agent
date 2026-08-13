# 漫游策：查询与规划型旅行智能体

## 工作流程

```text
用户需求
  → 意图路由（新建 / 修改 / 问答 / 澄清）
  → Skill Registry 按意图选出本轮 Skills
  → prepare 阶段并行查询天气与联网来源
  → 百炼模型根据工具结果生成结构化 TripPlan
  → 后端归一化时间、预算、地图链接和来源
  → enrich 阶段用高德 POI 与路径规划补充坐标、相邻路程和耗时
  → validate 阶段检查时间顺序、路线细节、预算与非预订边界
  → 网页展示并支持继续修改、撤销与只读分享
```

## Skill 编排

| 意图 | 实际编排 |
| --- | --- |
| 新建行程 | collect-trip-needs → research-destination → discover-flyai-pois → compose-itinerary → optimize-map-route → validate-itinerary |
| 修改行程 | revise-itinerary → optimize-map-route → validate-itinerary |
| 旅行问答 | research-destination → validate-itinerary |
| 分享 | share-trip 由服务端分享接口执行，不由模型生成令牌 |

`research-destination` 复用了阿里云百炼成熟 Web Search 工作流：通过 Responses API 的 `web_search` 工具检索，并且只接受 API 返回在 `web_search_call.action.sources` 中的 URL。天气使用 Open-Meteo。`discover-flyai-pois` 适配 MIT 许可的阿里 FlyAI `search-poi`，只保留查询字段并过滤预订入口；`optimize-map-route` 使用高德 Web 服务的 POI 搜索和路径规划 2.0。路线、美食、预算、增量修改和分享仍由产品领域 Skill 与确定性运行时代码控制。

Coze 与 SkillHub 页面未提供可审计的完整 Skill 包及许可证，因此没有复制其隐藏提示词。若获得作者导出的 SKILL.md 与许可证，可继续按同一注册表接入。

## 输出结构

每天包含路线总览、餐饮建议和按时间排序的活动；每个活动包含具体游览动作、预计时长、交通衔接、菜品/餐饮建议、提示、费用与高德地图搜索链接。联网来源会随行程保存并展示，动态信息要求出发前复核。

## 能力边界

本应用只查询和规划，不执行预订、下单、占座或支付。

---

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Email and name are intended for display or contact purposes.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
