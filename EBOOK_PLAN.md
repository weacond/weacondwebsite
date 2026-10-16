# Weacond 电子书商城 — 上线手册（单一权威来源）

> **本文件是唯一权威来源。** `GUIDE.md`、`START_HERE.md` 是它的快速版；三者若冲突，以本文件为准。
> 最后更新：2026-10-15 ｜ 平台条款已按 2026 年核实。

---

## 0. 两件必须先解决的事

### 0.1 内容缺口（已生成占位，待你替换为真文）
- 3 本有真实内容：`rational-101`、`black-swan`、`options-selling`（各有 preview + content）。
- 其余 **22 本已用 `node scripts/genEbooks.mjs` 生成中英双语【占位】preview + content**（点进去能读、不 404）。
- `index.json` 25 本已补齐 `desc_cn / desc_en / number / type`。
- 仍缺：**`private/ebooks/files/*.pdf|epub|html` 成品**（25 本）。你说过做好了但仓库里没有 .pdf/.epub（我搜过桌面）——需你放进 `private/ebooks/files/` 并同步到 R2 私有桶。
→ **动作**：把 25 本真文按 5.6 节写进 `content/*.md`（覆盖占位）+ 成品放进 `files/`；占位可安全删除。

### 0.2 安全修复（本次已完成，需你配合）
- `pages/api/ebook-content.js`：全文**只从私有桶**取、强制购买校验（service_role 查 purchases，绕开 RLS，不泄漏记录）。
- `pages/api/download.js`：**修复严重 bug** — 原代码把 cookie 里的 `sb-access-token`（JWT）直接当 email 查库，导致下载恒 403；已改为 `auth.getUser(token)` 取真实 email。
- `supabase/schema.sql`：新增 `check_purchase()` 安全函数；**移除** `purchases` 表 `for select using(true)` 全开放策略（原会让任何人枚举全部购买记录，隐私漏洞）。
- 新增 `GET /api/purchases`：按登录态返回该用户已购 slug（"已购 ✓" 的真实来源，绕开 RLS 隐私风险）。
- 新增本地守卫 `scripts/checkLeak.mjs`（`prebuild` 钩子）：阻断把全文/二进制放进 `public/`。
- 把旧生成器 `scripts/gen_index.py`（3 本免费旧模型）**改成熔断**，防它覆盖 `index.json`。
- ⚠️ **若你已在 Supabase 跑过旧版 schema，请重新执行一次 `supabase/schema.sql`**（`create or replace`，幂等）。

---

## 一、平台与商用条款（2026 已核实）

| 功能 | 平台 | 免费额度 | 商用是否需付费 | 结论 |
|------|------|---------|---------------|------|
| 网站托管 | Cloudflare Workers/Pages（next-on-pages） | 10 万请求/天、10ms CPU/次、Worker≤3MB、2 万文件/站、500GB 带宽 | 免费商用 ✅ | 用；⚠️ 见 1.1 免费硬限 |
| 内容存储 | Cloudflare R2 | 10GB 存储、**出口 0 费用** | 免费商用 ✅ | 用；**出口免费是相对 AWS S3 的核心优势** |
| 用户认证 | Supabase | 500MB / 5 万 MAU / 5GB 出口 / 1GB 文件 | 免费档**允许商用** ✅ | 用；⚠️ 见 1.2 空闲暂停 |
| 支付 | Stripe | 无月费，2.9% + $0.30/笔 | 天然商用 ✅ | 用 |
| 域名 | weacond.com | 年费 ~$10-15 | — | 你已有 |

### 1.1 Cloudflare 免费硬限（务必知道）
- 单次调用 **10ms CPU**、每请求 **50 个子请求**、单个 Worker **≤3MB**、环境变量 64 个。
- 你的 API 路由（`/api/checkout`、`/api/ebook-content`、`/api/download`）每次要连 Supabase/Stripe/R2，可能接近 50 子请求上限。
- **对策**：API 路由保持"薄"（只做转发，不做重计算）；若超限，升 Workers 付费 **$5/月**（1000 万请求、5 分钟 CPU、10MB Worker）即可彻底消除。静态页/文件在 Pages 上，免费 500GB 带宽，25 本毫无压力。

### 1.2 Supabase 空闲暂停
- 免费项目**空闲 7 天自动暂停**、无自动备份、上限 2 个活跃项目。
- **对策**：有真实流量后升 **Pro $25/月**（不暂停、有备份、8GB）；或保持每天有少量请求（心跳）。购买记录是关键数据，建议升 Pro。

### 1.3 为什么淘汰 Vercel / Notion
- **Vercel**：Hobby 计划禁止商用、收入超 $10k 需升级 → 换 **Cloudflare Pages**（无商用限制、带宽慷慨）。
- **Notion**：API 商用/规模受限、且不适合当内容仓库 → 换 **Cloudflare R2**（出口免费、无商用限制）。

---

## 二、架构

```
浏览器 → Cloudflare Worker（Next.js，next-on-pages 打包）
   ├─ R2 weacond-public （公开）→ index.json、preview/*.md（第一章）、封面
   ├─ R2 weacond-private（私有）→ content/*.md（全文）、files/*.pdf|html|epub（签 30 天临时 URL）
   ├─ Supabase           → 用户 + purchases（check_purchase 函数校验）
   └─ Stripe             → 动态定价 checkout + webhook 写 purchases
```
- **定价**：全部 25 本收费，**动态定价**（价格写在 `lib/stripe.js` 的 `BOOK_CATALOG`/`BUNDLE`，**无需在 Stripe 后台建产品**）。
- **预览**：第一章放公开桶，任何人可读（引流）。
- **全文/文件**：只在私有桶；`/api/ebook-content` 与 `/api/download` 先校验购买（`check_purchase`）再签 30 天临时 URL。
- **熔断**：`.github/workflows/deploy.yml` 会在公开桶里出现 `content/` 时**失败构建**，杜绝全文外泄。

---

## 三、文件结构（✅ 已建好 / ⚠️ 待补）

```
weacondwebsite/
├── public/ebooks/index.json            ✅ 25 本目录（全付费 + 双语描述）
├── public/ebooks/preview/*.md          ✅ 25 本（3 真 + 22 占位，genEbooks.mjs 生成）
├── private/ebooks/content/*.md         ✅ 25 本（3 真 + 22 占位）
├── private/ebooks/files/*.pdf|epub|html⚠️ 仍空：需放 25 本成品（最大缺口）
├── pages/api/ebook-content.js          ✅ 私有桶 + 购买校验（service_role）
├── pages/api/download.js               ✅ 已修：token→真实email→签名 URL
├── pages/api/checkout.js               ✅ 动态定价（POST {bookSlug,email}）
├── pages/api/checkout/webhook.js       ✅ 写 purchases（service_role，套装展开 25 slug）
├── pages/api/purchases.js              ✅ 新增：返回用户已购 slug（"已购✓"来源）
├── lib/checkoutClient.js               ✅ 新增：购买按钮 → Stripe 跳转
├── pages/ebooks.js | [slug].js | dashboard.js ✅ 已接购买 + "已购" + 成功横幅
├── lib/r2.js | stripe.js | supabase.js | ebookStore.js   ✅
├── scripts/genEbooks.mjs               ✅ 占位/描述生成器（幂等）
├── scripts/checkLeak.mjs               ✅ 本地泄漏守卫（prebuild）
├── scripts/gen_index.py                ⛔ 已弃用熔断（勿运行，会回退 index.json）
├── supabase/schema.sql                 ✅ 已加 check_purchase（请重跑）
├── .github/workflows/deploy.yml        ✅ 含熔断器 + 公开/私有桶同步
└── .env.example                        ✅ 密钥清单
```

---

## 四、每个功能怎么实现（功能 → 平台 → 代码 → 数据流）

1. **书架 `/ebooks`** — Cloudflare Pages 静态页 ← `index.json`。卡片：书名/描述/价格/购买。
2. **阅读页 `/ebooks/[slug]`** — Pages(SSG)。第一章从公开桶取；未购显示 🔒；已购调 `/api/ebook-content` 取全文；`components/Watermark.js` 打邮箱水印。
3. **完整内容 API `/api/ebook-content`** — Worker 函数。读 `index.json` → 取 `content` 路径 → `check_purchase` 校验 → 从**私有桶**读 → 返回；未购 401、未配置 503。
4. **下载 `/api/download`** — Worker 函数。`check_purchase` 校验 → 签 30 天私有 URL → 重定向到 R2。
5. **购买** — `/api/checkout`（动态定价）→ Stripe Checkout → 支付成功 → `/api/checkout/webhook` 用 service_role 写 `purchases`（套装展开为 25 个 slug + `bundle-all`）。
6. **防爬/防泄** — `robots.txt` + `public/_headers`（noindex）+ 水印 + 内容不入 HTML（仅 API 取）+ 私有桶 + 熔断器。

## 五、你（人）要做的事，按平台

### 5.1 Cloudflare（R2 双桶 + 密钥）
1. dash.cloudflare.com → R2 → 建桶 `weacond-public`（启用「公共读」）、`weacond-private`（**保持私有**）。
2. 取 public 桶公共 URL，例如 `https://weacond-public.r2.cloudflarestorage.com` → 填 `R2_PUBLIC_URL`。
3. R2 → API 令牌 → 建 `Object Read and Write` 令牌（两个桶都选）→ 复制 → 填 `CLOUDFLARE_API_TOKEN`。
4. 点账号名 → 账户设置 → 复制 **Account ID** → 填 `CF_ACCOUNT_ID`（= `R2_ACCOUNT_ID`）。

### 5.2 Supabase
1. supabase.com → New Project → 等 1-2 分钟。
2. SQL Editor 执行 `supabase/schema.sql`（**含新 `check_purchase`，务必重跑**）。
3. Settings → API 复制：Project URL、anon public、service_role。

### 5.3 Stripe
1. dashboard.stripe.com 注册（**需法人/个体户实体 + 收款账户 + 税务信息**）。
2. **动态定价，无需建产品**。
3. Developers → API keys 复制 publishable + secret。
4. Webhooks → 端点 `https://weacond.com/api/checkout/webhook`，事件 `checkout.session.completed`，复制 **Signing secret** → 填 `STRIPE_WEBHOOK_SECRET`。
5. 把退款窗口设为 **7 天**（与 terms.js 对齐；见 6.3）。

### 5.4 GitHub + 密钥
1. 把代码推到 `https://github.com/weacond/weacondwebsite`。
2. Settings → Secrets and variables → Actions，添加以下（= `.env.example` 全部 + 1 个）：
`CF_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN`、`R2_PUBLIC_URL`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`NEXT_PUBLIC_MODEL_URL`、`NEXT_AI_MODELS`。
> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` 是最高权限密钥，**绝不能放进前端或 .env 之外的地方**；它只用于 webhook 写库。

### 5.5 域名 weacond.com
- 在域名注册商把 weacond.com 的 DNS 托管到 Cloudflare（或 CNAME 到 Worker 分配的 `*.workers.dev`），再把域名绑到该 Worker。

### 5.6 内容（25 本，当前最大缺口）
每本放 3 样：
- `public/ebooks/preview/xxx.md` — 第一章（公开）
- `private/ebooks/content/xxx.md` — 全文（私有）
- `private/ebooks/files/xxx.pdf` / `.html` / `.epub` — 成品（私有，供下载）

---

## 六、法律合规（你本人要做的动作）

**页面已就绪**：`/terms`（非投资建议、退款 7 天、知识产权、金融合规、责任限制、争议解决）、`/privacy`（Stripe 处理、本地 AI 不上传、第三方、数据保留 7 年、用户权利）。
**你本人还要做**：

1. **注册经营主体**：Stripe 收款要求法人/个体户；建议注册个体或公司，用于开票、对公、税务。
2. **版权登记**：25 本到 中国版权局 或 US Copyright Office 登记，并留存带日期戳的创作底稿。水印/robots 只是辅助，**登记才是维权依据**。
3. **退款政策对齐**：terms.js 写「7 天」，Stripe 默认 14 天——在 Stripe 后台把退款窗口设为 7 天，或把 terms 改成 14 天，二者必须一致。
4. **金融免责**：terms 已含「非投资建议 / 不保本 / 历史不代表未来 / 不提供代客理财 / 复制交易需牌照」。上线前**请律师过一遍**，尤其跨境收款的税务与外汇。
5. **跨境收款/税务**：若面向海外用户，注意外汇与税务申报；Stripe 支持多币种，保留交易凭证。
6. **数据合规**：面向中国大陆按《个人信息保护法》补「单独同意 / 数据出境」；面向欧盟补 GDPR（隐私页已含用户权利框架，按需扩写）。

---

## 七、成本

| 项 | 免费 | 有量后 |
|----|------|--------|
| Cloudflare Pages/Workers | $0 | 超限升 $5/月 |
| Cloudflare R2 | $0（10GB / 出口免费） | 超出按量 |
| Supabase | $0 | 建议升 Pro $25/月（去暂停、加备份） |
| Stripe | $0 月费 | 2.9% + $0.30/笔 |
| 域名 | ~$10-15/年 | 同 |

> 月收入 > 约 $33（含 $25 Pro）即回本；上线初期几乎 0 成本。

---

## 八、上线检查清单

- [ ] 把 22 本占位真文写进 `content/*.md`（覆盖占位）；删除不再需要的占位
- [ ] 放 25 本成品到 `private/ebooks/files/`（.pdf/.epub/.html）并同步到 R2 私有桶
- [ ] 本地 `npm run build` 绿（已验证 ✅）；`prebuild` 泄漏守卫通过 ✅
- [ ] 重跑 `supabase/schema.sql`（含 `check_purchase`，幂等）
- [ ] Cloudflare：双桶 + 令牌 + Account ID（私有桶 URL 应返回 404）
- [ ] Supabase：建项目 + 跑 schema + 复制 3 个 key
- [ ] Stripe：密钥 + webhook（URL 用 /api/checkout/webhook）+ 退款窗口 7 天
- [ ] 域名 weacond.com 指向 Cloudflare
- [ ] （可选）占位真文替换后，重跑 `node scripts/genEbooks.mjs` 保持结构一致

---

## 九、已知风险与对策

| 风险 | 对策 |
|------|------|
| Cloudflare 免费 10ms/50 子请求 | 路由保持薄；超限升 $5/月 |
| Supabase 空闲 7 天暂停 | 升 Pro 或加心跳；关键数据建议 Pro |
| 内容被爬 | robots + _headers + 水印 + 私有桶 + 购买校验 |
| 误把全文放公开桶 | **本地 `checkLeak.mjs`（prebuild）+ deploy.yml 熔断器**双重阻断 |
| 旧脚本回退 index.json | `gen_index.py` 已熔断；统一用 `genEbooks.mjs` |
| 下载恒 403 | `download.js` 已修（token→email），已验证 |
| "已购" 被改 localStorage 绕过 | 服务端 `/api/purchases` 为真实来源，客户端仅缓存 |
| 版权被侵权 | 登记版权 + 水印溯源 |
| webhook 失败漏记录 | Stripe 后台监控 + 自动重试；唯一索引已保证幂等 |

---
*生成：2026-10-15 ｜ 旧版备份在 `/tmp/EBOOK_PLAN.bak.md`*