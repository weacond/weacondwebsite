# Weacond 电子书 — 从零上线操作清单

> 按顺序做，每步都有链接。预计 60 分钟。
> 前提：你有一台电脑、能访问这些网站、愿意付几个月的 SaaS 费用（都可选 Pay-as-you-go）。

---

## 0. 先确认环境（5 分钟）

- 装 Node.js 20+：https://nodejs.org/ → 下 LTS 版 → 装
- 装 Git：https://git-scm.com/
- 打开终端，输入 `node -v`，看到 `v20` 或更高就 OK

---

## 0.5 注册 GitHub 并建仓库（5 分钟）

- 注册：https://github.com/join
- 建仓库：https://github.com/new → 名字填 `weacond` → 勾选 **Add a README** → **Create repository**
- 记下仓库地址：`https://github.com/你的账号/weacond.git`

---

## 1. Cloudflare（建两个存储桶，15 分钟）

**1.1 注册 / 登录**
- 网址：https://dash.cloudflare.com/sign-up
- 用邮箱注册（免费）

**1.2 建两个桶**
- 左侧菜单 → **R2** → **Create bucket**
- 第一个桶：名字填 `weacond-public`，地域选默认 → 创建
  - 点进 `weacond-public` → 左侧 **Settings** → **Public access** → 选 **Public bucket access** → 启用
  - 记下它给出的 URL（形如 `https://weacond-public.r2.cloudflarestorage.com`）
- 第二个桶：名字填 `weacond-private`，地域选默认 → 创建
  - **不要**开启它的 Public access（默认就是私有的，保持不动）

**1.3 拿 Account ID**
- 顶部点你的账号头像 → **Account settings**
- 复制 **Account ID**（一串 32 位字母数字）

**1.4 建 API Token**
- 左侧菜单 → **R2** → **API tokens**（或顶部 **My profile → API Tokens**）
- **Create token**
- Permissions：勾选 **Object Read and Write**
- 把两个桶都加进去
- 创建后复制这串 token（只出现一次，存好）

---

## 2. Supabase（建数据库，10 分钟）

**2.1 注册 / 登录**
- 网址：https://supabase.com/dashboard
- 免费注册

**2.2 新建项目**
- 点 **New project**
- Database name 填 `weacond`，Region 选离你近的
- 等 1–2 分钟初始化完成

**2.3 建表**
- 左侧 **SQL Editor** → 点 **+ New query**
- 把 `supabase/schema.sql` 里的内容全部粘贴进去 → 点 **Run**
- 看到 `purchases` 和 `subscriptions` 两个表就成功了

**2.4 复制密钥**
- 左侧 **Settings** → **API**
- 复制 3 样：
  - **Project URL**（形如 `https://xxxx.supabase.co`）
  - **anon public** key
  - **service_role** key（点 "Reveal" 显示）

---

## 3. Stripe（接支付，20 分钟）

**3.1 注册**
- 网址：https://dashboard.stripe.com/
- 用邮箱注册（需要身份证/银行卡，按提示填，几分钟）

**3.2 复制 API 密钥**
- 左侧 **Developers** → **API keys**
- 复制 **Publishable key**（`pk_test_...`）
- 复制 **Secret key**（`sk_test_...`，点显示）

**3.3 建 Webhook**
- 左侧 **Developers** → **Webhooks**
- 点 **Add endpoint**
- Endpoint URL 填：`https://weacond.com/api/checkout/webhook`
- Events 勾选：**`checkout.session.completed`**
- 保存后，点进这个 webhook，复制 **Signing secret**（`whsec_...`）
- 注意：现在它显示 "Failed" 是正常的，网站上线后会变绿

> 好消息：你**不需要**在 Stripe 后台建 22 个产品。
> 代码用的是"动态定价"，价格直接写在 `lib/stripe.js` 里，Stripe 自动创建。

---

## 4. 填环境变量（10 分钟）

**4.1 本地**
- 在项目文件夹打开 `cp .env.example .env.local`
- 编辑 `.env.local`，把上面复制的填进去：

```
R2_PUBLIC_URL=https://weacond-public.r2.cloudflarestorage.com
R2_ACCOUNT_ID=粘贴 Cloudflare Account ID
R2_API_TOKEN=粘贴 R2 API Token
R2_PRIVATE_BUCKET=weacond-private

NEXT_PUBLIC_SUPABASE_URL=https://你的.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=粘贴 anon key
SUPABASE_SERVICE_ROLE_KEY=粘贴 service_role key

STRIPE_SECRET_KEY=粘贴 sk_test_
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=粘贴 pk_test_
STRIPE_WEBHOOK_SECRET=粘贴 whsec_

NEXT_PUBLIC_SITE_URL=https://weacond.com
```

**4.2 GitHub 仓库**
- 网址：https://github.com/你的账号/你的仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
- 逐个添加这些名字的值：

| Secret 名字 | 填什么 |
|---|---|
| `CF_ACCOUNT_ID` | Cloudflare Account ID |
| `CLOUDFLARE_API_TOKEN` | 一个有 Workers + R2 权限的 Cloudflare API token（在 https://dash.cloudflare.com/profile/api-tokens 建，选 "Edit Cloudflare Workers" 模板） |
| `R2_ACCOUNT_ID` | 同 CF_ACCOUNT_ID |
| `R2_API_TOKEN` | R2 API Token |
| `R2_PUBLIC_URL` | `https://weacond-public.r2.cloudflarestorage.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
| `STRIPE_SECRET_KEY` | sk_test_ |
| `STRIPE_WEBHOOK_SECRET` | whsec_ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | pk_test_ |

---

## 5. 部署（5 分钟）

**5.1 推送代码**
- 终端进入项目文件夹，第一次运行（把代码连到 GitHub）：
```
git init
git add .
git commit -m "上线 v1"
git branch -M main
git remote add origin https://github.com/你的账号/weacond.git
git push -u origin main
```
- 之后每次改完代码就 `git add . && git commit -m "说明" && git push`
- 推送后 GitHub 会自动触发构建部署（去仓库 **Actions** 标签页看进度，约 3–5 分钟）

**5.2 绑定域名（可选）**
- https://dash.cloudflare.com → **Workers & Pages** → 点 `weacond` → **Settings** → **Domains and Routes** → 加 `weacond.com`

---

## 6. 验证（10 分钟）

打开 https://weacond.com，逐项检查：

- [ ] 首页能打开
- [ ] 电子书列表页能看到 25 本书，价格正常显示（不是 `$undefined`）
- [ ] 每本书能看到第 1 章免费预览；付费书需购买后才看得到全文
- [ ] 付费书显示"购买"按钮
- [ ] 点购买 → 跳 Stripe → 用测试卡 `4242 4242 4242 4242` 付款成功
- [ ] 付款后跳回 dashboard，能看到刚买的书
- [ ] 去 Supabase **SQL Editor** 跑 `select * from purchases;` 看有没有记录

测试卡：https://stripe.com/docs/testing → 4242 那张能成功

---

## 现在代码状态（重要）

✅ 已修好，可直接上线的部分：
- 架构：Cloudflare Workers（next-on-pages）
- 部署：GitHub Actions 自动部署 + 同步公开文件到 R2
- 支付：`checkout.js`（动态定价，不用建 22 个产品）
- 回执：`webhook.js`（写入购买记录 + 套装逻辑）
- 数据库：`purchases` / `subscriptions` 表 + RLS
- 目录：25 本书（全部付费，每本带第 1 章免费预览）+ 套装
- 显示：价格统一用 `price_cents` → 自动转美元

⚠️ 上线后建议补的两点（不影响首次上线，但影响完整体验）：
1. **购买按钮**：`pages/ebooks.js` 和 `pages/ebooks/[slug].js` 的"购买"按钮现在跳 `/pricing` 页面，还没接 `/api/checkout` 自动跳转。需要时把按钮改成 fetch `/api/checkout` 再 `window.location = url`。
2. **书籍内容**：22 本付费书只有目录，没有正文文件。需要往 `public/ebooks/preview/`（预览）和 `private/ebooks/`（完整，上传到私有桶）补 `.md` 文件。

---

## 成本（每月）

| 服务 | 费用 |
|---|---|
| Cloudflare Workers | 免费 10 万请求/天 |
| R2 | 按量，几乎可忽略 |
| Supabase | 免费层够用 |
| Stripe | 2.9% + 30¢/笔 |
| 域名 | ~$10/年 |
