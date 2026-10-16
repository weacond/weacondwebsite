# Weacond 电子书 — 上线指南

> 照着这个做，3 个服务配好就能卖书。

---

## 架构

```
用户浏览器 → Cloudflare Worker（静态页面 + API 路由）
                        │
                        ├── R2 公开桶 → 预览、封面、index.json
                        ├── R2 私有桶 → 完整内容（签名 URL）
                        ├── Supabase  → 用户 + 购买记录
                        └── Stripe    → 支付
```

---

## 第 1 步：Cloudflare R2（15 分钟）

### 1.1 创建两个桶

1. 登录 https://dash.cloudflare.com → 左侧 **R2** → **创建存储桶**
2. 创建 **weacond-public**：
   - 名称：`weacond-public`
   - 地域：自动
   - 点进去 → **设置** → **公开访问** → 启用 **公共读访问**
   - 记下 URL：`https://weacond-public.r2.cloudflarestorage.com`
3. 创建 **weacond-private**：
   - 名称：`weacond-private`
   - 地域：自动
   - **不要**启用公开访问（默认就是私有的）

### 1.2 创建 R2 API Token

1. **R2** → **API 令牌** → **创建令牌**
2. 权限：`Object Read and Write`
3. 桶：两个都选
4. 复制 Token → 填到 `.env` 的 `R2_API_TOKEN`

### 1.3 找 Cloudflare Account ID

1. **R2** → 左上角 → 点你的账号名 → **账户设置**
2. 复制 **Account ID** → 填到 `.env` 的 `R2_ACCOUNT_ID`

### 1.4 上传文件到 R2

用 Cloudflare CLI：

```bash
npm install -g wrangler

# 上传公开文件（预览 + 目录 + 封面）
wrangler r2 object put weacond-public/index.json --file public/ebooks/index.json
wrangler r2 object put weacond-public/preview/rational-101.md --file public/ebooks/preview/rational-101.md

# 上传私有内容（完整 MD）
wrangler r2 object put weacond-private/content/rational-101.md --file private/ebooks/rational-101.md
```

> 批量上传可以用 `wrangler r2 bucket sync` 或写脚本循环。

---

## 第 2 步：Supabase（10 分钟）

### 2.1 创建项目

1. 登录 https://supabase.com → **New Project**
2. 数据库名：`weacond`
3. 等待初始化完成（1-2 分钟）

### 2.2 执行 SQL

1. 进入项目 → **SQL Editor**
2. 打开 `supabase/schema.sql`，全选粘贴执行
3. 确认 `purchases` 和 `subscriptions` 表已创建

### 2.3 复制密钥

1. **Settings** → **API**
2. 复制：
   - **Project URL** → `.env` 的 `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `.env` 的 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `.env` 的 `SUPABASE_SERVICE_ROLE_KEY`

---

## 第 3 步：Stripe（20 分钟）

### 3.1 创建账户

1. 登录 https://dashboard.stripe.com
2. 如果没有账户，注册一个

### 3.2 创建 25 个产品

用脚本批量创建（在终端运行）：

```bash
# 安装 Stripe CLI
brew install stripe/stripe-cli/stripe

# 登录
stripe login

# 用 Python 脚本批量创建（见 scripts/create_stripe_products.py）
```

或者手动在 Dashboard → **Products** → **Add product** 逐个创建：

| 产品名 | 价格 | 类型 |
|--------|------|------|
| Rational Investing 101 | $0 | One-time |
| Behavioral Biases | $0 | One-time |
| Macro Economics Basics | $0 | One-time |
| Equity Pricing Models | $99 | One-time |
| Risk Management Framework | $99 | One-time |
| ... | ... | ... |
| Weacond Complete Bundle | $199 | One-time |

### 3.3 复制密钥

1. **Developers** → **API keys**
2. 复制：
   - **Publishable key** → `.env` 的 `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `.env` 的 `STRIPE_SECRET_KEY`

### 3.4 创建 Webhook

1. **Developers** → **Webhooks** → **Add endpoint**
2. 端点 URL：`https://weacond.com/api/checkout/webhook`
3. 事件：勾选 `checkout.session.completed`
4. 复制 **Signing secret** → `.env` 的 `STRIPE_WEBHOOK_SECRET`

---

## 第 4 步：环境变量（5 分钟）

### 4.1 本地开发

```bash
cp .env.example .env.local
# 编辑 .env.local，填入所有密钥
```

### 4.2 GitHub Actions Secrets

1. GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
2. 添加以下 Secrets：

| Secret 名 | 值 |
|-----------|-----|
| `CF_ACCOUNT_ID` | Cloudflare Account ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token（Worker 部署用） |
| `R2_ACCOUNT_ID` | 同 CF_ACCOUNT_ID |
| `R2_API_TOKEN` | R2 API Token |
| `R2_PUBLIC_URL` | `https://weacond-public.r2.cloudflarestorage.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

### 4.3 Cloudflare Worker 环境变量

1. https://dash.cloudflare.com → **Workers & Pages** → 找到 `weacond` → **Settings** → **Variables and Secrets**
2. 添加相同的 Secrets（同 4.2）

---

## 第 5 步：部署（5 分钟）

### 5.1 推送到 GitHub

```bash
git add .
git commit -m "feat: ebook store v1 — 25 books"
git push origin main
```

### 5.2 GitHub Actions 自动部署

1. 推送后 GitHub Actions 自动运行
2. 构建 Next.js → 通过 `@cloudflare/next-on-pages` 转为 Worker → 部署到 Cloudflare
3. 同步公开文件到 R2 公开桶
4. 查看 Actions 日志确认成功

### 5.3 验证

1. 打开 `https://weacond.com`
2. 测试：
   - 免费书能阅读 ✅
   - 付费书显示购买按钮 ✅
   - 点击购买跳转 Stripe ✅
   - 支付成功后跳转 dashboard ✅
   - Dashboard 显示已购书籍 ✅
   - 付费内容需要登录 + 已购买 ✅

---

## 文件结构

```
weacondwebsite/
├── .env.example          ← 环境变量模板
├── .github/workflows/
│   └── deploy.yml        ← 自动部署（Pages + R2）
├── lib/
│   ├── r2.js            ← R2 客户端（双桶）
│   ├── stripe.js        ← 25 本书 + 套装
│   └── supabase.js      ← 用户 + 购买
├── pages/
│   ├── api/
│   │   ├── checkout.js  ← 创建 Checkout Session
│   │   └── checkout/webhook.js ← Stripe Webhook
│   ├── ebooks.js        ← 列表页
│   ├── ebooks/[slug].js ← 详情页
│   └── dashboard.js     ← 用户中心
├── public/ebooks/
│   ├── index.json       ← 25 本书目录
│   └── preview/         ← 公开预览（3 本免费）
├── private/ebooks/      ← 付费内容（不部署，上传到 R2）
├── supabase/schema.sql  ← 数据库
├── wrangler.toml        ← Worker 配置
├── scripts/
│   ├── gen_index.py     ← 生成 index.json
│   └── syncR2.js        ← R2 同步脚本
└── GUIDE.md             ← 本文件
```

---

## 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| 页面白屏 | 环境变量没配 | 检查 Worker 环境变量 |
| API 返回 404 | `@cloudflare/next-on-pages` 未构建 | 检查 Actions 日志 |
| R2 文件 403 | 私有桶没配 Token | 检查 R2_API_TOKEN |
| Stripe 支付失败 | Webhook 没配 | 检查 STRIPE_WEBHOOK_SECRET |
| 购买记录没写入 | Supabase 密钥不对 | 检查 SUPABASE_SERVICE_ROLE_KEY |