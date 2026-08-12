import assert from "node:assert/strict";
import test from "node:test";

let workerPromise;
async function worker(){workerPromise??=import(new URL("../dist/server/index.js",import.meta.url).href).then(x=>x.default);return workerPromise}
const env={ASSETS:{fetch:async()=>new Response("Not found",{status:404})},DB:{prepare(){throw new Error("D1 not configured in render test")}}};
const ctx={waitUntil(){},passThroughOnException(){}};

test("renders the travel planning studio",async()=>{const response=await (await worker()).fetch(new Request("http://localhost/",{headers:{accept:"text/html"}}),env,ctx);assert.equal(response.status,200);const html=await response.text();assert.match(html,/漫游策/);assert.match(html,/京都 · 慢游秋日/);assert.match(html,/Skill 编排轨迹/);assert.doesNotMatch(html,/codex-preview|react-loading-skeleton/)});
test("renders the built-in friend share link",async()=>{const response=await (await worker()).fetch(new Request("http://localhost/share/kyoto-friends",{headers:{accept:"text/html"}}),env,ctx);assert.equal(response.status,200);const html=await response.text();assert.match(html,/A trip shared with you/);assert.match(html,/伏见稻荷大社/);assert.match(html,/只读分享视图/)});
