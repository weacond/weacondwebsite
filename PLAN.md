# Weacond — 主计划（Master Plan / 单一事实来源）

> 这份文件是全局主计划；它合并并取代了仓库里零散的子手册，这些子手册已归档到 `docs/plans/`：
> `docs/plans/START_HERE.md` / `docs/plans/GUIDE.md` / `docs/plans/EXECUTION_PLAN.md` /
> `docs/plans/EBOOK_PLAN.md` / `docs/plans/DEPLOY.md`。它们仍可作细节参考，但**以本文件为准**；
> 文档总索引见 `docs/INDEX.md`。
> 目标读者：你（个人 / 1–3 人小团队）。最后更新：见 git log。
>
> 一句话结论：**你的架构已经搭好 80%，且已经迁移到 Cloudflare。现在唯一卡在“能不能卖书”的
> 是一件事——去 Cloudflare 账号里建两个 R2 桶。** 其余都是“填密钥 + 注册法律主体”。

---

## 0. TL;DR（先读这 5 条）

1. **平台已验证**：Vercel 免费版**禁止商用**（其 ToS §5 写明 Hobby 仅 personal / non-commercial）；
   你的站要收钱，所以**换成 Cloudflare Pages**（免费、允许商用、带宽不限）是正确的。
   Notion 不是“托管平台”而是“文档 SaaS”，它不放进代码——你说的“Notion 换 R2”其实指
   **把电子书正文/PDF 存进 Cloudflare R2**，这一步**已经写好**，只差建桶。
2. **架构（已建好）**：Cloudflare Pages（Next.js 14，`@cloudflare/next-on-pages`）
   + Supabase（用户/购买记录）+ Stripe（收款）+ R2（电子书内容，双桶）+ Alpha Vantage/FRED（行情/宏观）
   + 本地 AI（`@mlc-ai/web-llm`，WebGPU，无 WebGPU 自动降级到云端）。
3. **唯一阻断上线销售的项**：R2 的 `weacond-public` / `weacond-private` 两个桶尚未在 Cloudflare
   账号里创建 → `wrangler.toml` 里 R2 绑定被注释掉 → 下载接口 500。**用 `node scripts/enableR2.mjs` 一条命令解决。**
4. **法律**：走 **Route A（SaaS + 数据 + 教育，不碰代客理财/代下单/资金托管）** → **不需要金融牌照
   （CMSL 等）**，只需：每页免责声明（已做）+ 服务条款/隐私政策（已做）+ 数据源授权 + 注册法律主体。
5. **本周可执行**：见第 6 节“本周 5 件事”。做完后跑 `npm run check:deploy` 应输出“可购买就绪”。

---

## 1. 平台验证结论（已用官方条款核验）

| 旧选择 | 问题 | 换成 | 为什么对 | 商用 | 状态 |
|---|---|---|---|---|---|
| **Vercel** | 免费 Hobby 版 ToS 明示**仅个人/非商用**；要商用需 Pro（$20/座席/月） | **Cloudflare Pages** | 免费、**允许商用**、带宽不限、500 次构建/月；`next-on-pages` 支持 Next 14 | ✅ 免费允许 | **代码已迁移完成** |
| **Notion** | 是“文档 SaaS”，不是托管层；放正文进 Notion 无法对付费用户做门禁/计量 | **Cloudflare R2**（双桶） | 对象存储、**出站流量（egress）免费**、免费 10GB/月、$0.015/GB；可与 Next 服务端签名 URL 配合做付费门禁 | ✅ 免费允许 | **代码已写好，差建桶** |

**核验来源**：
- Vercel ToS §5 “Hobby Plan … You shall only use the Services under a Hobby plan for your personal or non-commercial use.”
- Cloudflare Pages 免费版：无“仅个人使用”限制，静态文件免费且不限带宽，500 次构建/月，Workers 10 万请求/天免费。
- Cloudflare R2 定价：Standard $0.015/GB-月，**Egress 免费**；免费额度 10GB-月 + 100 万次 Class A + 1000 万次 Class B。
  注意：`r2.dev`/`*.r2.cloudflarestorage.com` 公共域名适合开发；生产建议绑自定义域名；大文件视频类需走 Cloudflare 付费服务，
  但**你的电子书 PDF（中等体积）在免费额度内没问题**。

> **结论：你的两个替换判断都对。无需回退 Vercel/Notion。**

---

## 2. 当前架构（已建好）

```
                 ┌─────────────────────────────────────────────┐
   用户浏览器  ─▶ │  Cloudflare Pages（Next.js 14 + next-on-pages）│
   (weacond.com)  │  静态页 + /api/* 路由 + 本地 AI(WebGPU)        │
                 └───────┬───────────┬───────────┬──────────────┘
                         │           │           │
                  Stripe │     Supabase │     Cloudflare R2 │
                  (收款)  │     (用户/购买)│  (电子书内容双桶) │
                         │           │           │
              Alpha Vantage / FRED（行情/宏观，可选，缺失则优雅降级）
```

**页面（`pages/`）→ 数据源 → 状态**

| 功能 | 路由 | 平台/依赖 | 代码位置 | 状态 |
|---|---|---|---|---|
| 信号卡 | `/signals` | Alpha Vantage | `pages/signals.js`, `components/SignalHistory.js` | ✅（无 key 降级） |
| 回测 | `/backtest` | 纯本地 | `lib/backtest.js`（16 策略 + 网格优化 + MFI） | ✅ 完成 |
| 宏观 | `/macro` | FRED | `pages/macro.js` | ✅（无 key 降级） |
| 模拟盘 | `/paper` | 本地 + 行情 | `pages/paper.js` | ✅ 完成 |
| 期权/IV | `/options` | 本地/行情 | `pages/options.js` | ✅ |
| 策略对比 | `/strategies`, `/compare` | 本地 | `pages/strategies.js`, `pages/compare.js` | ✅ |
| 黑天鹅 | `/black-swan` | 本地蒙特卡洛 | `pages/black-swan.js` | ✅ 完成 |
| 本地 AI | `/ai` | `@mlc-ai/web-llm` WebGPU + 云端降级 | `pages/ai.js`, `lib/ai*` | ✅（无 WebGPU 降级） |
| 电子书 | `/ebooks` | **R2（双桶）** + Stripe + Supabase | `pages/ebooks.js`, `lib/r2.js`, `scripts/uploadR2.mjs` | ⚠️ **差建 R2 桶** |
| 仪表盘 | `/dashboard` | Supabase | `pages/dashboard.js` | ✅ |
| 定价 | `/pricing` | Stripe | `pages/pricing.js`, `lib/stripe.js` | ✅ |
| 登录 | `/login` | Supabase Auth | `pages/login.js` | ✅ |
| 法务 | `/terms`, `/privacy` | 静态 | `lib/legalContent.js` | ✅ 中英双语 |

**关键脚本（已存在）**：`scripts/uploadR2.mjs`（上传内容）、`scripts/syncR2.js`（校验）、
`scripts/checkDeploy.mjs`（就绪度自检）、`scripts/checkLeak.mjs`（防付费全文泄漏，build 前钩子）、
`scripts/genEbooks.mjs`（生成 25 本目录）。CI：`.github/workflows/deploy.yml`（3 个 job：
发布 Pages + 同步公开 R2 + 同步私有 R2，均带熔断）。

---

## 3. 功能 → 实现 → 平台 → 代码 → 法律（核心映射表）

这是你要的“我的功能要怎么实现，要用到什么平台，什么代码，要怎么处理相关法律”。
按“已建好 / 待做”分列。

### 3.1 已建好（你只需接密钥 + 建桶）

| 功能 | 怎么用 | 平台 | 代码 | 法律要点 |
|---|---|---|---|---|
| 信号/回测/宏观/期权/黑天鹅/模拟盘 | 纯本地计算，数据缺失则演示 | Cloudflare Pages | `lib/*`, `pages/*` | 每页免责声明（已在 `Footer` + 各页）；**禁止“保证回报”式表述** |
| 本地 AI 对话/分析 | WebGPU 本地推理，无 GPU 降级云端 | Pages + 可选 OpenAI | `pages/ai.js` | 模型须为 **Apache-2.0/MIT**（如 Qwen3/Mistral/DeepSeek-V3 开源版）；禁用 NC 模型 |
| 电子书销售 | 预览走公开桶，正文/PDF 走私有桶 + 签名 URL | **R2 + Stripe + Supabase** | `lib/r2.js`, `lib/stripe.js`, `scripts/uploadR2.mjs` | 付费内容 = 数字商品，需税务设置；7 天退款（已在 ToS） |
| 定价/订阅 | 动态定价在代码里 | Stripe | `lib/stripe.js`, `pages/pricing.js` | 退款政策、自动续费、争议处理（已在 ToS） |

### 3.2 待做（代码或控制台）

| 功能 | 怎么用 | 平台 | 代码/动作 | 法律/合规 |
|---|---|---|---|---|
| **R2 建桶（解锁卖书）** | 两条命令建桶+开公共访问 | Cloudflare R2 | **`node scripts/enableR2.mjs`**（本次新增） | 无 |
| 本地支付方式（RHB / Touch'n Go，马来） | 收款本地化 | 第三方支付网关 | 需新写 `lib/payments/`（Phase 2） | 资金入境/外汇合规 |
| API Sandbox / 开发者门户 | 卖“确定性”给 B 端 | Pages `/api` | 需新写（Phase 2–3） | 需 **API 使用条款**（已在 ToS §5）+ 速率限制 |
| 策略市场 / 创作者分成 | 上架/审核/结算 | Supabase + R2 | 需新写（Phase 3） | **创作者合同模板**（原创性/风险披露/分成） |
| 复制交易 / 代下单 | 自动执行 | 券商 API | **Phase 4，且必须先做牌照评估** | **Route C：需金融牌照 + KYC/AML**，暂不做 |
| 突发消息/宏观简报 | 抓取+推送 | Web Push / 邮件 | `NEXT_PUBLIC_USE_WEB_PUSH`（已留接口） | 内容免责声明 + 不得构成投资建议 |

---

## 4. 法律与合规（你应该怎么做）

**总原则：走 Route A —— 只做 SaaS + 数据 + 教育，不碰资金托管、不代客理财、不代下单。**
这样你**不需要金融牌照**（如新加坡 CMSL、美国 broker-dealer 牌照），只用技术 + 法律文本即可合规运营。
复制交易/托管属于 Route C，等你年营收上千万、有法务团队时再走。

| 事项 | 现状 | 你要做 |
|---|---|---|
| 每页免责声明 | ✅ 已在 `Footer` + `signals/options/backtest/…` | 上线前确认所有新页面都引入 `<Footer/>` |
| 服务条款 / 隐私政策 | ✅ `lib/legalContent.js` 中英双语 | 上线前请律师过一遍（尤其数据共享、争议解决、管辖地） |
| 数字商品税务 | 部分 | 在 Stripe 后台开启税务设置（按用户所在地区自动计税、出发票） |
| 数据源授权 | ⚠️ 待确认 | 逐一核对 **Alpha Vantage / FRED / 任何付费行情** 的商用与二次分发条款；商用需采购授权 |
| 模型合规 | ⚠️ 需核对 | 只上架 **Apache-2.0 / MIT** 模型；保留每个模型的 LICENSE 文件与来源 |
| 退款/争议 | ✅ 7 天无条件退款（ToS §4） | Stripe 开启纠纷（dispute）自动记录与人工复核 |
| 反滥用 | ⚠️ 需做 | 多账户检测、IP 限流、API 速率限制、行为异常检测（Phase 2） |
| KYC / AML | 暂不需要 | **仅当未来做托管/代下单（Route C）时启用** |
| 法律主体 | ❌ 未注册 | 注册一个公司（SaaS/数据/教育性质），作为收款与合同主体 |

> 合规最低集（上线前必须）：① 每页免责声明；② 完整 ToS + 隐私政策；③ 数据源商用授权；
> ④ 模型 LICENSE 核验；⑤ 注册法律主体；⑥ 收款邮箱 `weacond@gmail.com` 可用。

---

## 5. 商业化（定价 / 支付 / 退款）

- **支付通道**：初期 **Stripe（国际）+ 本地（RHB/Touch'n Go，Phase 2）**；中长期加 USDT。
- **动态定价在代码里**（`lib/stripe.js`，无需在 Stripe 后台逐个建产品）。
- **分层**（与 `pages/pricing.js` 对齐，可按 A/B 调整权重）：
  - Free（引流）：注册 + 3 天高级体验。
  - Basic：$9.9/月 或 $99/年。
  - PutSeller（主推）：$29.9–59/月 或 $299–590/年。
  - ProQuant（回测/API）：$149–199/月 或 $1490/年。
  - Enterprise：$999+/月，按需报价 + SLA。
- **退款**：7 天无条件（年付首次/活动除外），24h 内处理（已在 ToS）。
- **发票/税务**：Stripe 自动发票 + 用户仪表盘可下载；按地区自动计税。

---

## 6. 本周就能做的 5 件事（含“去哪个控制台点哪里”）

> 目标：本周结束跑 `npm run check:deploy` 输出“**可购买就绪**”。

1. **建 R2 两桶（解锁卖书）**：在 `.env.local` 填 `CLOUDFLARE_API_TOKEN`（Dashboard→My Profile→API Tokens→
   “Edit Cloudflare Workers / R2 read+write”）与 `CLOUDFLARE_ACCOUNT_ID`，然后
   `node scripts/enableR2.mjs` → 自动创建 `weacond-public`/`weacond-private` 并开公共访问。
   之后 `node scripts/uploadR2.mjs --dry` 预演、去掉 `--dry` 真传。
2. **在 `wrangler.toml` 取消 R2 绑定注释**（桶建好后），并按 `.env.example` 把
   `R2_PUBLIC_URL / R2_ACCOUNT_ID / R2_API_TOKEN` 填好。
3. **建 Supabase 项目**：`supabase.com → New Project`，在 SQL Editor 执行 `supabase/schema.sql`，
   把 anon key / service role key 填入 Secrets（service role 仅服务端）。
4. **建 Stripe 收款**：复制 `sk_live_` 与 `whsec_`；创建 Webhook `https://weacond.com/api/checkout/webhook`
   （事件 `checkout.session.completed`、`invoice.payment_failed`）。
5. **在 GitHub 仓库 Settings → Secrets and variables** 设置：`R2_*`、`SUPABASE_*`、`STRIPE_*`、
   `ALPHA_VANTAGE_API_KEY`、`FREDSERIESKEY`、`NEXT_PUBLIC_SITE_URL=https://weacond.com`。
   然后 `git push` → CI 自动发布 + 同步 R2。

> 法律主体注册、数据源商用授权可与上面并行，属“上线前必做”，非“本周硬卡点”。

---

## 7. 路线图（现实版 · 个人/小团队）

> 你原手册的“16–20 人 / 65k–110k USD 月成本 / 1 亿美金估值”是**终局愿景**，不是当下。
> 当下你是 1 人在 MacBook M5 Pro 上开发。好消息是：**手册里 Phase 1/2 的多数功能你已经做完了。**

- **Phase 0（本周）**：解锁卖书（R2 + 密钥 + 法律主体）。→ 立刻有现金流。
- **Phase 1（0–2 月）**：MVP 上线 = 信号 + 公允价值(阶段A) + 仪表盘 + 3 天任务 + Stripe/本地支付 + 客服工单。
- **Phase 2（2–4 月）**：黑天鹅（✅已做）+ API Sandbox + 自动任务发放 + 至少 1 份付费数据源。
- **Phase 3（4–8 月）**：回测/模拟盘（✅已做）+ 策略市场初版（上架/审核/分成）。
- **Phase 4（8–12 月）**：券商复制交易 + 实时 WebSocket + 企业 API（**需牌照评估**）。
- **Phase 5（12–18 月）**：多语、白标、税务导出、国际化 SaaS。

**“不可或缺”护城河（你的终局）**：数据积累（历史回测+实时）+ 品牌信任（公开长期绩效单）
+ 平台生态（策略市场 + API 授权）。优先级：先 B 端 API 授权（杠杆最大），再生态。

---

## 8. 风险与坑

- **R2 绑定未恢复**：桶没建好前，`wrangler.toml` 保持注释，否则 `/api/*` 会 500（已知现象，已在注释说明）。
- **付费全文泄漏**：`checkLeak.mjs` + CI 熔断会阻断把全文/PDF 放进 `public/`。正文只在 `private/` 与私有 R2 桶。
- **模型许可证**：务必只上架 Apache-2.0/MIT；保留 LICENSE，避免侵权诉讼。
- **数据源商用**：免费额度（如 Alpha Vantage 5 次/分）与商用条款需核对，商用要采购授权。
- **复制交易/托管**：未做牌照前**绝不**上线；这是 Route C。
- **本地 AI 降级**：无 WebGPU 时走云端（需 `OPENAI_API_KEY`），不配则返回占位，属预期。

---

## 9. 参考链接

- Cloudflare Pages + Next.js：https://developers.cloudflare.com/pages/framework-guides/nextjs/
- R2 定价/出站免费：https://developers.cloudflare.com/r2/pricing/
- Vercel ToS（Hobby 非商用）：https://vercel.com/legal/terms
- Stripe Webhooks：https://stripe.com/docs/webhooks
- Supabase RLS：https://supabase.com/docs/guides/database/postgres/row-level-security

---

## 附录 A：书放在哪（速查）

共 **25 本**，每本**中英双语**（英文=默认 `.md` 无后缀；中文=`.cn.md` / `.cn.pdf`）。

| 位置 | 内容 | 文件数 | 上哪个 R2 桶 |
|---|---|---|---|
| `private/ebooks/content/` | 全书正文（`.md` + `.cn.md`） | 50 | 私有桶 `weacond-private`（key `content/{slug}(.cn).md`） |
| `private/ebooks/files/` | 可下载 PDF（`.pdf` + `.cn.pdf`） | 50 | 私有桶 `weacond-private`（key `files/{slug}(.cn).pdf`） |
| `public/ebooks/preview/` | 第 1 章预览（公网可读） | 50 | 公开桶 `weacond-public`（key `preview/{slug}(.cn).md`） |
| `public/ebooks/index.json` | 目录（slug/中英标题/价格/类别） | 1 | 公开桶 `weacond-public`（key `index.json`） |

- 目录/编目源 = `public/ebooks/index.json`；定价读自 `lib/stripe.js`；消费方 `pages/ebooks/[slug].js`、`pages/api/ebook-content.js`、`pages/api/checkout*.js`。
- R2 客户端 = `lib/r2.js`（公开 `fetchEbookIndex`/`fetchEbookContent`；私有 `presignPrivate`/`fetchPrivateContent`，走 `R2_ACCOUNT_ID`+`R2_API_TOKEN` 的 REST API）。
- 生成/上传：`node scripts/genEbooks.mjs`（补占位内容，幂等）、`node scripts/uploadR2.mjs`（传 R2，先 `--dry`）。
- 守卫：`scripts/checkLeak.mjs`（build 前）+ CI 熔断，确保付费全文绝不进 `public/`。

## 附录 B：本次新增/改动文件

| 文件 | 作用 |
|---|---|
| `PLAN.md`（本文件） | 单一事实来源：平台结论/架构/功能→平台→代码→法律/路线图/风险 |
| `scripts/enableR2.mjs` | 一条命令幂等建双桶 + 开公共访问；`--dry` 预演、`--check` 只读自检（可挂 CI） |
| `wrangler.toml` | R2 绑定改为「安全恢复模板」（保持注释，含前置步骤；桶不存在则不取消以免破坏部署） |
| `docs/pricing-standalone.html` | 可打印/转 PDF：三档定价 + CTA + 7 天邮件序列 + SLA + 合规底线（无外部依赖） |
| `package.json` | 新增 `enable:r2` 与 `check:r2` 脚本 |

> 验证状态：`node --check` 通过、`npm run check:r2` 在缺密钥时给清晰提示并退出 1、
> `--dry` 正常、`checkLeak` 通过、`npm test` 401/401 全绿。应用代码未改动，仅新增脚本/文档/配置。

---

## 附录 C：本批次开发增量（4 项全做）

| 项 | 结论 | 验证 |
|---|---|---|
| ① 宏观接 FRED | **已存在**：`pages/macro.js` 的 `loadFred()`/`loadYieldCurve()` 已拉 `/api/marketdata?fred=…`，无 key 时诚实回退演示值。无需改动。 | build 通过 |
| ② 新增指标 | 新增 **CMF（Chaikin 资金流）** 指标 + `cmf` 资金流策略（momentum 类），进 `STRATEGY_REGISTRY`，回测/对比 UI 自动可用。 | 2 个新测试 |
| ③ OAuth 登录 | `/api/auth` 增 `oauth` action（provider 白名单 + 优雅降级）+ `pages/login.js` 增第三方登录按钮（`NEXT_PUBLIC_OAUTH_PROVIDERS` 控制，未配则不渲染）。 | 1 个新测试 + build |
| ④ CI R2 门禁 | `deploy.yml` 增 `r2-gate` job（`enableR2 --check`）：未配密钥自动跳过、配好即强制；`deploy-worker` 依赖它。 | YAML 校验通过 |

> 本批次后：`npm test` **404/404** 全绿；`next build` 退出 0（`/login`、`/macro`、`/pricing` 等全部编译通过）。
> 仍待你提供密钥（提供即自动生效，无需改代码）：
> - **FRED**：`FREDSERIESKEY`（或 `ALPHA_VANTAGE_API_KEY`）→ 宏观页出真实利率/通胀/就业/信用利差。
> - **OAuth**：在 Supabase Dashboard 配好 provider 的 client 凭证，并设 `NEXT_PUBLIC_OAUTH_PROVIDERS`（如 `google,github`）→ 登录页出现第三方登录按钮。
> - **R2**：`R2_API_TOKEN` + `R2_ACCOUNT_ID` → `npm run enable:r2` 建桶，CI `r2-gate` 变强制门禁。
>
> 追加：① `/ebooks` 落地页（已存在：R2 公开桶 + 本地 `index.json` 兜底 + 已购校验）；
> ② 新增 `pages/auth/callback.js` 闭环 OAuth（supabase 自动换 session，未配则回登录页，
> 8s 兜底）；③ CMF 作为**可选第 5 票**纳入 `signalConsensus`/`signalConsensusSeries`
> （`opts.cmf`，默认 4 票行为完全不变，零回归）。测试 **406/406** 全绿，`next build` 退出 0。
