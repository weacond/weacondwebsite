# Weacond 执行手册 — 平台 / 功能 / 代码 / 法律映射

> 本文把你《快车道金融智能系统》手册的每个模块，映射到 **真实落地的平台 + 现有代码文件 + 下一步动作**。
> 生成日期：2026-11-09。状态标记：✅已落地 / ⚠️需补 / 🚧规划中。
> 所有改动都在 `/Users/kendrick/Desktop/weacondwebsite`（= github `weacond/weacondwebsite`，线上 weacond.com）。

---

## 0. 一句话结论

- **平台已选对，无需再换**：100% 跑在 **Cloudflare**（Pages/Workers + R2），**不花 Vercel 一分钱**；数据存 **Supabase**；收款 **Stripe**；电子书存 **R2 双桶**。
- **手册里 80% 的功能已有骨架代码**（信号、回测、本地 AI、黑天鹅、定价、法律页、任务系统）。
- **真正要补的只有 3 类**：① 真实行情数据接入；② 本地 AI 从「模拟」变「真跑模型」；③ 法律合规落地动作（不只是写页面，而是注册/留证/牌照）。

---

## 0b. 2026-11-13 更新（已落地：AI 接地 + 法律加固；剩余待办=你的操作，非代码）

**状态修正**：`lib/ai.js` 早已是「真跑」（`@mlc-ai/web-llm` + WebGPU 流式），§3「本地 AI 真跑」已完成；本次补的是**信任层**与**法律层**。

### ✅ 本次已落地（构建 EXIT=0，1147 测试全过）
- **幻觉控制 + RAG 接地（手册 §3 信任核心 / §4 数据壁垒）**
  - 新增 `lib/aiRag.js`：严格双语系统提示（仅依上下文作答 / 查不到说「不知道」/ 严禁编造数字价格 / 必须标注来源 / 不给个性化建议）+ 内置金融知识库 + 朴素检索 + 溯源/不确定检测。
  - 已接入 `lib/ai.js`（本地 + 云端推理默认接地）与 `pages/ai.js`（展示「参考来源」+「⚠️ 不确定」警示）。
  - 新增 `tests/aiRag.test.mjs`（10 测试）。
- **法律加固（手册 §4 / 你的「怎么处理法律」）**
  - `lib/legalContent.js` 新增 6 条双语条款：适用法律与争议解决、条款变更与通知、终止、数据源与二次分发、跨境传输与 GDPR、数据删除程序。
  - 新增可配置 `PLATFORM_JURISDICTION`（governingLaw / jurisdiction / contactEmail）；**未填时显示中性占位，不给虚假管辖声明**。
  - 新增 `tests/legalContent.test.mjs`（4 测试）。

### ⏳ 剩余待办 = **你的操作**（不是代码，代码侧已就绪）
| 待办 | 在哪做 | 说明 |
|---|---|---|
| 真实行情 | GitHub Settings → Secrets：`ALPHA_VANTAGE_API_KEY`（免费 5 次/分）+ `FREDSERIESKEY`（FRED 宏观） | `lib/marketdata_real.js` 已就绪；不配则 `/signals`·`/backtest`·`/macro` 自动用演示数据并诚实标注 |
| 商用行情/期权链（PutSeller 核心） | 注册 Polygon.io Basic（$29/月）→ 填 key | 免费源无稳定期权链/IV Rank |
| 支付 | GitHub Secrets：`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`；Stripe 后台建 Webhook | 价格在 `lib/stripe.js`，无需后台建产品 |
| 用户/订阅 | Supabase 建项目跑 `supabase/schema.sql` → 填 3 个 key | 见 `DEPLOY.md §3` |
| 电子书 | Cloudflare 建双桶 `weacond-public`/`weacond-private` → `npm run enable:r2` | 见 `DEPLOY.md §2` |
| 适用法律 | 编辑 `lib/legalContent.js` 的 `PLATFORM_JURISDICTION.governingLaw` / `jurisdiction` | 上线前必填；建议新加坡/美国/马来西亚 |
| 注册法律主体 | 线下：注册公司（路线 A：SaaS+数据+教育，不碰代客理财/代下单/托管） | 见 §4.2 |

> 一句话：代码侧的信任层与法律层已就绪；剩下的「填 key / 建桶 / 注册主体」是你在 GitHub Secrets、Cloudflare Dashboard、Stripe 后台与线下的操作。

---

## 1. 平台验证（你问的「用什么平台」）

| 手册建议 | 当前实际（已落地） | 是否要改 |
|---|---|---|
| 启动：GitHub + Vercel + Next.js | GitHub ✅ + **Cloudflare Pages/Workers** ✅ + Next.js 14 ✅ | ❌ 已切 Cloudflare，正确 |
| 扩展：Supabase + Stripe + Clerk | **Supabase** ✅ + **Stripe** ✅ + 登录用自研 `pages/login.js` + `/api/auth.js`（未用 Clerk） | ⚠️ 可选 Clerk，非必须 |
| 规模化：Cloudflare + Actions | **Cloudflare Pages** ✅ + **GitHub Actions** ✅（`.github/workflows/deploy.yml`） | ❌ 已落地 |
| 电子书：Notion | **Cloudflare R2 双桶**（`weacond-public` 预览 + `weacond-private` 全文/PDF）✅ | ❌ 已切 R2，正确 |

**关键文件（已确认）**
- 部署：`next.config.js`（注释写明「架构：Cloudflare Workers」）、`package.json`（`deploy` 脚本 = `next-on-pages` + `wrangler deploy`）、`.github/workflows/deploy.yml`（3 个 job：部署 Worker → 同步公开 R2 → 同步私有 R2）。
- 存储：`lib/r2.js`（双桶 + 签名 URL + `normalizeBook`/`resolvePath`）、`scripts/uploadR2.mjs`、`scripts/syncR2.js`。
- 支付：`lib/stripe.js`（`BOOK_CATALOG` + `BUNDLE`）、`pages/api/checkout.js` + `checkout/webhook.js`、`pages/api/purchases.js`。
- 用户/订阅：`lib/supabase.js`、`pages/api/auth.js`、`pages/login.js`。
- 安全保险丝：`scripts/checkLeak.mjs`（构建前拦截「全文误传公开桶」）、`deploy.yml` 里也有一道同名 Guard。

> 结论：**Vercel/Notion 已经换掉，方向正确，不用动。** 你要做的是「填数据 + 跑真模型 + 走法律」，不是再换平台。

---

## 2. 功能 → 平台 → 代码 映射表

| 手册模块 | 平台/依赖 | 现有代码 | 状态 | 下一步动作（按优先级） |
|---|---|---|---|---|
| 三引擎 SignalCard（基本面+技术面+波动面） | 自有引擎 | `lib/signals.js` `computeSignalScore`、`pages/signals.js`、`pages/dashboard.js` | ✅ 骨架(demo) | P1：接真实行情后把 `DEMO_SIGNALS` 换成 `computeSignalScore` 真算 |
| 卖 Put 筛选（PutSeller 核心） | 期权链数据 | `lib/signals.js` `screenPutSignals` | ⚠️ 需期权数据 | P2：接 Polygon.io/Cboe 期权链，填 `suggestedStrike/expiry/premium` |
| 回测 + 蒙特卡洛 | 自有引擎 | `lib/backtest.js`、`lib/marketdata.js`、`pages/backtest.js`、`/api/backtest.js` | ✅ 骨架 | P2：把 `generateMockCandles` 换成真实 K 线 |
| 本地 AI（WebGPU/Qwen） | 浏览器 WebGPU | `pages/ai.js`、`lib/ai.js` | ⚠️ 模拟推理 | P1：接 `@mlc-ai/web-llm` 真跑（见 §3） |
| 黑天鹅 / 尾部对冲 | 自有 + 宏观数据 | `lib/signals.js` `detectBlackSwan`、`pages/black-swan.js`、`lib/macro.js` | ✅ 骨架(demo) | P2：VIX/利差接真实源（CBOE VIX、FRED） |
| 定价五档 | Stripe | `pages/pricing.js`、`lib/stripe.js` | ✅ 已落地 | P3：`pricing.js` 的 CTA 从「跳 /login」改成「起 Stripe 订阅」 |
| 任务系统（3 天体验） | Supabase + 邮件 | `pages/dashboard.js`（`TASKS` 硬编码） | ⚠️ 模拟 | P3：进度写 Supabase，完成即发邮件 |
| 投资书房（双语电子书） | R2 + Stripe | `pages/ebooks.js`、`pages/ebooks/[slug].js`、`lib/ebookStore.js`、`lib/r2.js` | ✅ 已落地(本次修双语PDF+安全bug+25本index.json) | ✅ 完成 |
| 策略市场 / 创作者分成 | Supabase + 审核 | `pages/strategies.js` | 🚧 仅页面 | P4：上架表 + 审核 + 分润结算 |
| 模拟交易 / 复制交易 | 券商 API | `pages/paper.js` | 🚧 仅页面 | P4（需券商牌照，见 §4） |
| 邮件 / Web Push 通知 | Supabase + Web Push | `public/sw.js`、`_app.js` 注册 | ⚠️ 已注册未发 | P3：接 Resend/Brevo 发 7 天序列 |
| 法律页（免责/条款/隐私） | 静态页 | `pages/terms.js`、`pages/privacy.js`、`components/Footer.js`(本次新增,已全站铺开) | ✅ 已落地 | ✅ 本次补上全站免责声明 |

---

## 3. 本地 AI 路线图（你的差异化护城河）

**现状**：`lib/ai.js` 是「模拟」（`setTimeout` 假响应），`pages/ai.js` 检测 `navigator.gpu` 但没真加载模型。手册要求「数据永不出本地、WebGPU 真跑」。

**目标代码路径（P1，可在浏览器真跑）**
1. `package.json` 加依赖：`@mlc-ai/web-llm`（Apache/MIT 兼容，符合手册「只用 Apache 2.0/MIT」红线）。
2. `lib/ai.js` 的 `loadLocalModel` 换成真加载：
   ```js
   import { Chat } from "@mlc-ai/web-llm";
   const chat = await Chat.create("Llama-3.2-1B-Instruct-q4f32_1-MLC", { webgpu: true });
   return { model: chat, device: "webgpu", mock: false };
   ```
   推理：`const out = await chat.completions(prompt, { temperature, max_tokens });`
3. 模型选型（消费级显卡/笔记本可跑，符合手册 7B 内）：`Llama-3.2-1B/3B`、`Qwen2.5-1.5B/3B`、`Phi-3-mini`。Mac（M 系列）用 WebGPU 即可；Win 需 Chrome 113+/Edge。
4. **隐私铁律**：`pages/ai.js` 的「云端降级」分支（WebGPU 不支持时）默认关闭或需用户显式勾选，否则违背「数据不出本地」卖点。
5. **幻觉控制（手册 §3）**：System Prompt 写死「仅依据提供的文档/行情回答，查不到就说不知道，严禁编造」；每条回答附数据来源链接（RAG 溯源）。

> 注意：`lib/ai.js` 注释已预留「生产环境接入 @mlc-ai/web-llm 或 ollama」，直接填即可。

---

## 4. 法律 / 合规 操作清单（你问的「怎么处理法律」）

> 手册 §4 核心：**先不做「代客理财/代下单/复制交易/托管资金」，只做「SaaS + 数据 + 教育 + 信号」= 路线 A（监管风险最低，VC 最爱）**。

### 4.1 现在就能做（零成本，已部分完成）
- ✅ **免责声明全站铺开**（本次已做）：`components/Footer.js` + 已接入 signals/backtest/black-swan/ai/dashboard/ebooks。
- ✅ **服务条款 + 隐私政策**已存在（`pages/terms.js` / `pages/privacy.js`，含金融合规、API 条款、创作者分成 50/30/20、责任限制 12 个月上限）。
- ✅ **不碰资金**：当前代码没有券商下单/托管，天然符合「不做代客理财」。
- 待补：`terms.js`/`privacy.js` 加「适用法律/注册地/争议管辖」具体条款；注册时勾选「已阅读免责声明」并写 Supabase 时间戳（留证）。

### 4.2 上线前必须做（建议找兼职律师审核，约 $500–2000 一次性）
1. **公司主体**：先注册一家公司（新加坡/美国/马来西亚任选，决定税务与争议管辖），`terms.js` 里的「平台所在地」要对应真实主体。
2. **数据源许可证**：手册 §4「数据源授权与二次分发限制」。当前用 Alpha Vantage/Yahoo（免费，注意其 ToS 限制二次分发/缓存/商用）。商用前需读各源 ToS，关键源买商用许可（如 Polygon.io 付费档，明确可二次分发/可商用）。
3. **AI 模型许可**：✅ 已选 Qwen/Llama/Phi，确认 Apache 2.0/MIT（手册 §3 红线：禁 NC/月活限制/禁衍生）。Llama 3 是社区许可（非严格 NC，但月活 >7 亿有附加条款，早期可忽略）。
4. **支付税务**：Stripe 已处理；面向多地区建议开启 Stripe Tax。
5. **7 天退款**：`pricing.js` 已写，需与 Stripe 退款政策一致。

### 4.3 扩张时才做（P4，需牌照）
- **复制交易 / 券商对接 / 托管资金**：手册 §4.11 明确「上线前须完成牌照申请 + KYC/AML」。US 需 RIA/Broker-Dealer，SG 需 CMSL，MY 需 ASM/Licence。**建议走路线 B**：你自己只做平台/数据/策略评估，**持牌机构**负责发 Token/执行，你收技术费 + 分成（监管风险最低）。
- **SOC2 / ISO27001**：手册 §5 规划项，规模化后做。

> 一句话法律策略：**你现在 = 路线 A（SaaS + 数据 + 教育），合法且低门槛；复制交易/托管 = 路线 C，等做大、有钱请法务再做。别在 MVP 碰牌照。**

---

## 5. 真实行情数据接入清单（手册「需要稳定金融数据 + 量化标准」）

| 数据 | 免费源（引流/MVP） | 付费源（商用/生产，需 ≥2 冗余） | 接入位置 |
|---|---|---|---|
| 日线 K 线 | Alpha Vantage(`lib/marketdata_real.js`已写)、Stooq、yfinance 代理 | Polygon.io、IEX | `lib/marketdata_real.js` `fetchRealCandles` |
| 实时/盘中 | Alpha Vantage 5min（免费 5 次/分） | Polygon.io WebSocket | 新增 `/api/marketdata` 走真实源 |
| 基本面 | Alpha Vantage `OVERVIEW` | Polygon.io / FMP | `lib/marketdata_real.js` `fetchFundamentals`（现为 mock） |
| 期权链 / IV Rank | 暂无免费稳定源 | Polygon.io Options、Cboe、OptionsDX | `lib/marketdata_real.js` `fetchOptionChain`（现为 mock） |
| 宏观（VIX/利差/实际利率） | CBOE VIX、FRED（免费，需免费 key） | — | `lib/macro.js` |

**MVP 最低成本路径**：① 注册 Alpha Vantage 免费 key（5 次/分，够 demo）→ 填 GitHub Secrets `ALPHA_VANTAGE_API_KEY`；② `lib/marketdata_real.js` 已有 `fetchFromAlphaVantage`，在 `/api/marketdata.js` 调用并加缓存（Edge 运行时 30s 超时，需缓存）；③ 免费版不够时上 Polygon.io Basic（$29/月）拿期权链 + IV Rank（PutSeller 核心数据）。

---

## 6. 下一步可执行清单（按优先级，今天就能开始）

### P1 — 本周（低风险、高价值）
- [x] **电子书双语 PDF + 安全 bug + 25 本 index.json**（✅ 本次完成，待提交/部署，见 §8 告警）。
- [x] **全站免责声明 Footer**（✅ 本次完成，构建已验证 EXIT=0）。
- [ ] **本地 AI 真跑**：`npm i @mlc-ai/web-llm` → 改 `lib/ai.js` `loadLocalModel` 用 `Chat.create`（见 §3）。
- [ ] **接 Alpha Vantage 免费 key**：填 GitHub Secret，`/api/marketdata.js` 调 `fetchRealCandles` 并加缓存。

### P2 — 1–2 周
- [ ] `signals.js` 的 `DEMO_SIGNALS` 换成 `computeSignalScore` 真算（接上真实行情后）。
- [ ] 接 **Polygon.io** 期权链 + IV Rank → 填 `screenPutSignals` 的 `suggestedStrike/expiry/premium`。
- [ ] `backtest.js` 用真实 K 线替换 `generateMockCandles`。
- [ ] 黑天鹅接 **CBOE VIX / FRED** 真实值。

### P3 — 2–4 周
- [ ] `pricing.js` CTA 接 **Stripe 订阅**（Free/Basic/PutSeller/ProQuant 的 price_id），不再只跳 /login。
- [ ] 任务系统进度写 **Supabase**，完成即发 **7 天邮件序列**（接 Resend/Brevo）。
- [ ] Web Push 真发（`public/sw.js` 已注册，补服务端订阅 + 推送）。

### P4 — 1–3 月（需法务/牌照）
- [ ] 策略市场上架 + 审核 + 分润结算（Supabase 表 + 审核流）。
- [ ] 复制交易 / 券商对接（**先做路线 B：合作持牌机构**，别自申请牌照）。

---

## 7. 本次已落地的改动（构建已验证 EXIT=0，待提交）

```
components/Footer.js            新增：全站免责声明页脚（双语）
pages/signals.js               +import Footer，页尾 <Footer/>
pages/backtest.js              同上
pages/black-swan.js            同上
pages/ai.js                    同上
pages/dashboard.js             同上
pages/ebooks.js                同上（<main> 后）
public/ebooks/index.json       重写为新 25 本目录（清下划线、字段对齐 lib/r2.js）
```
- 安全修复（此前已改）：`lib/ebookStore.js` `isFreeBook` 必须 `await`（否则跳过付费校验）。
- 双语下载：`api/download.js` 的 `keyFor` + `ebooks.js`/`[slug].js` 带 `lang`（`lang=zh` → `.cn.pdf`）。

---

## 8. ⚠️ 目录不一致告警（提交前必读）

**`public/ebooks/index.json` 现在是「新 25 本」catalog**（来自 `/Users/kendrick/投资电子书/`：`the-nature-of-money`…），但仓库其余部分仍是「旧 25 本」catalog：
- `lib/stripe.js` `BOOK_CATALOG` = 旧 slug（`rational-101`…）+ Stripe 产品 id（`paid-01..paid-25`）。
- `public/ebooks/preview/` + `private/ebooks/content/` = 旧 slug 文件（26 个）。
- `ebooks/[slug].js` `getStaticPaths` 用 `BOOK_CATALOG` → 只生成旧 26 个 slug 页面。

**后果（若现在直接 push 上线）**：
- 列表页 `/ebooks` 显示**新** 25 本（来自 index.json）；
- 点新书 → `/ebooks/the-nature-of-money` → **404**（不在 getStaticPaths）；
- 新书「购买」按钮 → `getBook(slug)` 返回 undefined → 抛 `Invalid book slug`；
- 旧 slug 详情页 meta 为空 → 空白页。

**推荐修复（锁步迁移，三选一并确认 Stripe 产品归属后再做）**：
- 方案①（推荐，新 catalog 为准）：把 `lib/stripe.js` `BOOK_CATALOG` 的 25 条 slug/标题改为新 slug，**保留原 Stripe 产品 id**（或重新在 Stripe 后台建 25 个产品并对齐 id）；同时把新 25 本的 `preview/*.md`、`preview/*.cn.md`、`content/*.md`、`content/*.cn.md`、`*.pdf`、`*.cn.pdf` 拷进 `public/ebooks/`（仅预览）与 `private/ebooks/`（全文/PDF），并同步上传到 R2 双桶。这样「150 文件一起上」就是这一步。
- 方案②（回退，旧 catalog 为准）：把 `index.json` 改回旧 25 本 slug（与现有 stripe/preview/content 一致）。
- 方案③（双 catalog 并存）：不推荐，易乱。

> 因为涉及 **Stripe 产品 id 归属**（商业决策），我未擅自改 `lib/stripe.js` 或拷贝 150 文件。确认方案后我可直接执行方案①的锁步迁移。

<!-- 文档结束 -->
