# Weacond 上线清单（Deploy Checklist）

> 目标：把本地已完成的平台（电子书 25 本 + 本地 AI + 信号/回测 + 合规）部署到 Cloudflare，
> 并接通 Supabase / Stripe / R2 / Alpha Vantage / FRED。逐项打勾即可上线。

## 0. 本地已验证（无需你操作）
- [x] `npm run build` 通过（13 页面，全部渲染 200）
- [x] `scripts/checkLeak.mjs` 内容泄漏守卫通过（public/ 无全文/二进制）
- [x] 无硬编码密钥；所有密钥走服务端 `process.env`
- [x] Webhook 验签用 Web Crypto（Edge 兼容）
- [x] 电子书目录已对齐 25 本双语（`index.json` = `BOOK_CATALOG`）
- [x] 本地 AI（`@mlc-ai/web-llm`）已接入，无 WebGPU 自动降级
- [x] 数据页接真实数据：`/signals` 信号 + `/backtest` 曲线 + `/macro` FRED 指标 + `/watchlist` 行情（无 key 优雅降级 + 诚实标注）
- [x] 模拟盘 `/paper`：入场/出场、实时盯市、绩效分析（胜率/利润因子）+ 累计盈亏曲线

## 1. 在 GitHub 仓库 Settings → Secrets 设置以下变量
| 变量 | 来源 | 说明 |
|---|---|---|
| `R2_PUBLIC_URL` | Cloudflare R2 | 公开桶 URL |
| `R2_ACCOUNT_ID` | Cloudflare | 账号 ID |
| `R2_API_TOKEN` | Cloudflare R2 | R2 scope, read+write |
| `R2_PRIVATE_BUCKET` | — | 默认 `weacond-private` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | 前端匿名 key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | 服务端 key（**仅服务端**，勿进前端） |
| `STRIPE_SECRET_KEY` | Stripe | `sk_live_...`（生产用 live） |
| `STRIPE_WEBHOOK_SECRET` | Stripe | `whsec_...` |
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage | 免费 key（`/signals` 信号、`/backtest` 曲线、`/watchlist` 行情、`/paper` 盯市；不配则降级演示数据） |
| `FREDSERIESKEY` | FRED (St. Louis Fed) | 免费 key（`/macro` 宏观指标；不配则降级演示数据） |
| `NEXT_PUBLIC_SITE_URL` | — | 例如 `https://weacond.com` |

> 完整模板见 `.env.example`。生产密钥请勿提交到 git（`.gitignore` 已忽略 `.env.local`）。

## 2. Cloudflare R2（双桶）
- [ ] 创建公开桶 `weacond-public`（预览/封面/index.json，开 Public access 或绑域名）
- [ ] 创建私有桶 `weacond-private`（完整正文/PDF，关 Public access）
- [ ] 把本地 `private/ebooks/content/*` 与 `private/ebooks/files/*` 上传到私有桶
- [ ] 把 `public/ebooks/preview/*` 与 `index.json` 上传到公开桶（CI 会自动同步 public/）

## 3. Supabase
- [ ] 新建项目，在 SQL Editor 执行 `supabase/schema.sql`
- [ ] 确认 `purchases` 表有 `RLS`，且 service role key 可读写
- [ ] 把 anon key / service role key 填进 Secrets

## 4. Stripe
- [ ] 复制 `sk_live_...` 与 `whsec_...`
- [ ] 创建 Webhook：`https://<your-domain>/api/checkout/webhook`
- [ ] 事件：`checkout.session.completed`、`invoice.payment_failed`
- [ ] 动态定价无需在后台建产品（价格在 `lib/stripe.js`）

## 5. 部署
```bash
git push origin main            # 触发 .github/workflows/deploy.yml
# CI 自动：build → 同步公开 R2 → 同步私有 R2（需 R2 密钥）→ 发布 Cloudflare Pages
```

## 6. 上线后冒烟测试
- [ ] `/` `/ebooks` 渲染 25 本 + 套装
- [ ] `/ebooks/the-nature-of-money` 预览 + 购买 + 下载 PDF（中/英）
- [ ] `/ai` 选模型 → WebGPU 本地推理（无 WebGPU 走云端降级）
- [ ] `/signals` 卡片 → 回测 / AI 解读跳转
- [ ] 支付：测试卡 4242 4242 4242 4242 走通 webhook → purchases 写入
- [ ] `/api/marketdata?symbol=SPY` 返回真实行情（配 key）或演示数据（未配）
- [ ] `/signals` 显示真实信号；`/backtest` 显示真实曲线
- [ ] `/macro` 显示 FRED 真实指标（配 `FREDSERIESKEY`）或演示数据
- [ ] `/paper` 自动盯市 + 绩效分析 + 累计盈亏曲线

## 7. 合规（生产前必做，非代码项）
- [ ] 注册法律主体（SaaS + 数据 + 教育，"Route A"，不碰代客理财/代下单/托管）
- [ ] 数据源授权（行情/财报数据使用授权）
- [ ] `weacond@gmail.com` 邮箱可用（隐私政策联系入口）
