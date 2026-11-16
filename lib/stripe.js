import { generateSignedUrl } from "./r2.js";

// 架构说明（重要）：
// Cloudflare Edge 运行时（@cloudflare/next-on-pages 强制所有路由跑在 Edge）
// 无法加载 Stripe 的 Node.js SDK（它依赖 Node 内置 http/crypto/net）。
// 因此这里不再 import Stripe Node SDK，改为：
//   - 创建 Checkout Session：直接 fetch 调 Stripe REST API（Edge 兼容）
//   - Webhook 验签：用 Web Crypto (crypto.subtle) 实现（见 pages/api/checkout/webhook.js）
// 纯数据/查询函数（BOOK_CATALOG / getBook / hasAccess / getR2Key 等）保持不变。

/** 25 本电子书目录 */
export const BOOK_CATALOG = [
  { id:"paid-01", slug:"the-nature-of-money", title_cn:"货币的本质", title_en:"The Nature of Money", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-02", slug:"personal-finance-foundation", title_cn:"个人理财·投资前的基础", title_en:"Personal Finance The Foundation Before Investing", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-03", slug:"power-of-compounding", title_cn:"复利的力量", title_en:"The Power of Compounding", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-04", slug:"financial-system", title_cn:"金融系统", title_en:"The Financial System", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-05", slug:"risk-return-mathematics", title_cn:"风险·收益与投资数学", title_en:"Risk Return and Investment Mathematics", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-06", slug:"behavioral-finance", title_cn:"财富心理与行为金融", title_en:"Wealth Psychology and Behavioral Finance", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-07", slug:"financial-markets", title_cn:"金融市场", title_en:"Financial Markets", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-08", slug:"stocks-and-equity-markets", title_cn:"股票与权益市场", title_en:"Stocks and Equity Markets", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-09", slug:"financial-statements-accounting", title_cn:"财务报表与会计", title_en:"Financial Statements and Accounting", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-10", slug:"valuation", title_cn:"估值", title_en:"Valuation From Price to Intrinsic Value", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-11", slug:"value-investing", title_cn:"价值投资与护城河", title_en:"Value Investing and the Moat", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-12", slug:"growth-stocks", title_cn:"成长股与行业周期", title_en:"Growth Stocks and Industry Cycles", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-13", slug:"etfs-and-index-funds", title_cn:"ETF与指数基金", title_en:"ETFs and Index Funds", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-14", slug:"bonds-and-fixed-income", title_cn:"债券与固定收益", title_en:"Bonds and Fixed Income", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-15", slug:"real-estate-and-reits", title_cn:"房地产与REITs", title_en:"Real Estate and REITs", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-16", slug:"commodities-gold-real-assets", title_cn:"商品黄金与真实资产", title_en:"Commodities Gold and Real Assets", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-17", slug:"asset-allocation", title_cn:"资产配置与组合构建", title_en:"Asset Allocation and Portfolio Construction", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-18", slug:"risk-management-tail-risk", title_cn:"风险管理与尾部风险", title_en:"Risk Management and Tail Risk", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-19", slug:"macroeconomics", title_cn:"宏观经济与货币政策", title_en:"Macroeconomics and Monetary Policy", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-20", slug:"global-fx-geopolitics", title_cn:"全球·外汇与地缘政治", title_en:"Global FX Geopolitics", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-21", slug:"research-information-literacy", title_cn:"研究能力与信息素养", title_en:"Research and Information Literacy", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-22", slug:"options-and-derivatives", title_cn:"期权与衍生品", title_en:"Options and Derivatives", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-23", slug:"quantitative-investing", title_cn:"量化与系统化投资", title_en:"Quantitative and Systematic Investing", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-24", slug:"technical-analysis", title_cn:"技术分析与市场策略", title_en:"Technical Analysis and Market Based Strategies", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-25", slug:"building-your-framework", title_cn:"构建你的投资体系", title_en:"Building Your Investment Framework", price_cents:700, category:"basics", type:"paid" },
];

/** 套装（比单买全部($175)便宜 ~55%） */
export const BUNDLE = {
  slug: "bundle-all",
  title_cn: "Weacond 全部 25 本套装",
  title_en: "Weacond Complete Bundle (25 books)",
  price_cents: 7900,
  type: "bundle",
};

/** 所有 slug 列表 */
export const ALL_SLUGS = BOOK_CATALOG.map((b) => b.slug);

/** 从 slug 查书 */
export function getBook(slug) {
  if (slug === BUNDLE.slug) return BUNDLE;
  return BOOK_CATALOG.find((b) => b.slug === slug);
}

/** 判断用户是否拥有某本书（含套装逻辑） */
export function hasAccess(userBooks, slug) {
  if (!userBooks) return false;
  if (userBooks.includes(BUNDLE.slug)) return true;
  return userBooks.includes(slug);
}

/**
 * 把 Stripe API 的嵌套对象序列化为 form-urlencoded（Stripe REST API 要求该格式）。
 * 例: { a: 1, b: { c: 2 }, d: [3, 4] } -> "a=1&b[c]=2&d[0]=3&d[1]=4"
 */
// 内部：把嵌套对象/数组递归展开为 parts 数组（不在此 join）。
// 关键：递归必须返回数组、只在顶层 join 一次；若递归返回已 join 的字符串再
// `push(...字符串)`，会把字符串逐字符展开、再用 & 拼接，生成畸形 body（历史 latent bug，
// 曾影响 createCheckoutSession / createSubscriptionSession 的嵌套字段，Stripe 会直接拒收）。
function _serializeStripeParamsToArray(obj, prefix = "") {
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const item = v[i];
        if (item === null || item === undefined) continue;
        const itemKey = `${key}[${i}]`;
        // 对象/数组元素递归展开；基本类型（如 "card"）直接 key=value。
        // 切勿对字符串再 Object.entries，否则 "card" 会被拆成 c/a/r/d 逐字符。
        if (typeof item === "object") {
          parts.push(..._serializeStripeParamsToArray(item, itemKey));
        } else {
          parts.push(`${encodeURIComponent(itemKey)}=${encodeURIComponent(String(item))}`);
        }
      }
    } else if (typeof v === "object") {
      parts.push(..._serializeStripeParamsToArray(v, key));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts;
}

/** 把 Stripe 嵌套对象序列化为 form-urlencoded 字符串（外部契约：返回字符串）。 */
function serializeStripeParams(obj, prefix = "") {
  return _serializeStripeParamsToArray(obj, prefix).join("&");
}

/** 创建 Checkout Session（Edge 兼容：直接调用 Stripe REST API，无需 Node SDK） */
export async function createCheckoutSession(bookSlug, email, locale = "en") {
  const book = getBook(bookSlug);
  if (!book) throw new Error("Invalid book slug");
  const isBundle = book.type === "bundle";
  const isFree = book.price_cents === 0;
  const params = {
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: isBundle ? "[Weacond] Bundle of 25 books" : `[Weacond] ${book.title_en}`,
          description: isFree ? "Free ebook" : `Weacond ebook: ${book.title_en}`,
          metadata: { slug: bookSlug, is_bundle: String(isBundle), amount_cents: String(book.price_cents) },
        },
        unit_amount: book.price_cents,
      },
      quantity: 1,
    }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://weacond.com"}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://weacond.com"}/ebooks?cancelled=true`,
    metadata: { slug: bookSlug, email, is_bundle: String(isBundle), amount_cents: String(book.price_cents), locale },
  };
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-12-18.acacia",
    },
    body: serializeStripeParams(params),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Stripe checkout failed ${res.status}: ${detail || res.statusText}`);
  }
  return await res.json();
}

/** 根据 slug 查 R2 key（按语言取：英文 content/{slug}.md，中文 content/{slug}.cn.md，缺失回退英文） */
export function getR2Key(slug, lang = "zh") {
  const cn = lang === "cn" || lang === "zh";
  return cn ? `content/${slug}.cn.md` : `content/${slug}.md`;
}

/** 获取私有内容签名 URL（1小时有效），按语言取 */
export async function getSignedContentUrl(slug, lang = "zh") {
  return generateSignedUrl(getR2Key(slug, lang), 3600);
}

// 注意：Edge 运行时不再导出 Stripe Node 实例。

// ---------- 订阅方案（动态定价，无需在 Stripe 后台建产品；价格与 pages/pricing.js 对齐）----------

/**
 * 订阅方案目录。type:
 *   "paid"    — 可结账（basic / putseller / proquant）
 *   "free"    — 仅登录，不发起支付（free）
 *   "contact" — 联系报价，不发起支付（enterprise）
 * 价格单位 = 分（cents）；price_year_cents 为 null 表示不提供年付。
 */
export const PLAN_CATALOG = [
  { key: "free", name: "Free", price_month_cents: 0, price_year_cents: 0, type: "free" },
  { key: "basic", name: "Basic", price_month_cents: 990, price_year_cents: 9900, type: "paid" },
  { key: "putseller", name: "PutSeller", price_month_cents: 2990, price_year_cents: 29900, type: "paid" },
  { key: "proquant", name: "ProQuant", price_month_cents: 14900, price_year_cents: 149000, type: "paid" },
  { key: "enterprise", name: "Enterprise", price_month_cents: 99900, price_year_cents: null, type: "contact" },
];

/** 按 key 查方案（未知 / 非字符串 → undefined，绝不抛错） */
export function getPlan(key) {
  return PLAN_CATALOG.find((p) => p.key === key);
}

/**
 * 是否可结账（关键安全不变量）：仅 type==="paid" 且月价 > 0 才允许发起支付。
 * free / enterprise / 未知方案一律返回 false —— 绝不发起任何 Stripe 请求。
 */
export function isSubscribable(key) {
  const p = getPlan(key);
  return !!p && p.type === "paid" && p.price_month_cents > 0;
}

/**
 * 取方案某档期价格（分）。interval "month" | "year"（缺省 "month"）。
 * 未知方案 / 该档期不存在（如 enterprise 无年价）→ null。
 */
export function planPriceCents(key, interval = "month") {
  const p = getPlan(key);
  if (!p) return null;
  const cents = interval === "year" ? p.price_year_cents : p.price_month_cents;
  return Number.isFinite(cents) ? cents : null;
}

/**
 * 创建订阅 Checkout Session（Edge 兼容：直接调 Stripe REST API，recurring 动态定价）。
 * 入参在发请求前逐项校验，非法方案 / 非订阅档 / 价格缺失一律抛错（network-free，可单测）。
 *
 * @param {string} planKey  方案 key（basic / putseller / proquant）
 * @param {string} email    客户邮箱（Stripe 会再次核对）
 * @param {"month"|"year"} [interval]  计费周期，缺省 "month"
 * @param {string} [locale]
 * @returns {Promise<Object>} Stripe Checkout Session 对象（含 .url）
 */
export async function createSubscriptionSession(planKey, email, interval = "month", locale = "en") {
  const p = getPlan(planKey);
  if (!p) throw new Error("Invalid plan key");
  if (p.type !== "paid") throw new Error("Plan is not subscribable");
  const iv = interval === "year" ? "year" : "month";
  const cents = planPriceCents(planKey, iv);
  if (cents === null || cents <= 0) throw new Error("Invalid plan price for interval");

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://weacond.com";
  const slug = "plan-" + planKey;
  const params = {
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `[Weacond] ${p.name}${iv === "year" ? " (annual)" : " (monthly)"}`,
            description: `Weacond ${p.name} subscription (${iv})`,
            metadata: { plan: planKey, interval: iv, type: "subscription" },
          },
          recurring: { interval: iv },
          unit_amount: cents,
        },
        quantity: 1,
      },
    ],
    success_url: `${base}/dashboard?success=true&plan=${encodeURIComponent(planKey)}&interval=${iv}`,
    cancel_url: `${base}/pricing?cancelled=true`,
    metadata: {
      plan: planKey,
      slug,
      interval: iv,
      amount_cents: String(cents),
      type: "subscription",
      locale,
      // 透传 email：Stripe 会把 metadata 带到 customer.subscription 对象，
      // 让 /api/checkout/webhook 能据此把订阅归属到具体邮箱（subscriptions 表）。
      email,
    },
  };
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-12-18.acacia",
    },
    body: serializeStripeParams(params),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Stripe subscription failed ${res.status}: ${detail || res.statusText}`);
  }
  return await res.json();
}

// ── 订阅自助管理（Billing Portal）：Edge 兼容，直接调 Stripe REST API ──────────
//
// 用户「管理/取消/升级」订阅的标准入口：创建 Stripe Billing Portal 会话，
// 返回 url 供前端跳转。customer id 来自 subscriptions 表（§0e 落库的 customer_id）。
//
// 入参 network-free 校验：无 STRIPE_SECRET_KEY 或缺 customerId → 返回 null（调用方降级，
// 绝不抛错）；仅真正调 Stripe 时才可能因网络/状态码抛错。可经 mock global.fetch 单测。
//
// @param {string} customerId  Stripe customer id（cust_xxx），来自 subscriptions 表
// @param {string} [returnUrl] 门户完成后跳回地址，缺省 /dashboard
// @returns {Promise<{url:string}|null>}
export async function createBillingPortalSession(customerId, returnUrl) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !customerId) return null;
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://weacond.com";
  const url = returnUrl || `${base}/dashboard`;
  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-12-18.acacia",
    },
    body: serializeStripeParams({ customer: customerId, return_url: url }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Stripe billing portal failed ${res.status}: ${detail || res.statusText}`);
  }
  const data = await res.json();
  return { url: data.url };
}

// ── 订阅生命周期（Webhook 用）：纯函数、可单测、无需网络 ────────────────────
//
// Stripe 订阅是长期关系：created → updated（续费/改档/取消）→ deleted。
// webhook 据 customer.subscription.* 事件把状态写进 subscriptions 表，
// 再用 check_subscription(email, plan) 判定权益。下面这些纯函数把"从事件
// 提取记录行 / 判定是否有效"抽出来，便于无网络单元测试。

// 触发"写 subscriptions 表"的三类 Stripe 事件。
export const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export function isSubscriptionEvent(type) {
  return SUBSCRIPTION_EVENTS.has(type);
}

// 归一 Stripe 订阅状态：canceled / cancelled 两种拼写统一为 "canceled"，全小写。
export function normalizeSubStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  return s === "cancelled" ? "canceled" : s;
}

// 该状态是否"有访问权"：active / trialing 视为有效；
// 其余（past_due / unpaid / canceled / incomplete / deleted 等）一律无效。
export function isSubscriptionActive(rawStatus) {
  const s = normalizeSubStatus(rawStatus);
  return s === "active" || s === "trialing";
}

/**
 * 从 customer.subscription.* 事件提取订阅记录行（写入 subscriptions 表）。
 * 非订阅事件 / 缺 email → 返回 null（绝不写无主记录）。纯函数、可单测。
 *
 * email 来源：createSubscriptionSession 把 email 透传到 checkout session 的
 * metadata，Stripe 会带到 customer.subscription 对象的 metadata.email；
 * 兜底 sub.customer_email。
 *
 * @param {object} event  Stripe webhook 事件（已验签）
 * @returns {object|null}  订阅记录行（含 email/plan/interval/status/...），
 *                         或 null（非订阅事件 / 无法归属到 email）
 */
export function buildSubscriptionRow(event) {
  if (!event || !isSubscriptionEvent(event.type)) return null;
  const sub = event.data && event.data.object;
  if (!sub || typeof sub !== "object") return null;

  const meta = sub.metadata || {};
  const email =
    (meta.email || sub.customer_email || "").trim().toLowerCase() || null;
  if (!email) return null;

  const periodEnd =
    sub.current_period_end != null
      ? new Date(Number(sub.current_period_end) * 1000).toISOString()
      : null;

  return {
    email,
    plan: meta.plan || "unknown",
    interval: meta.interval || "month",
    status: normalizeSubStatus(sub.status),
    stripe_subscription_id: sub.id || null,
    stripe_customer_id: sub.customer || null,
    current_period_end: periodEnd,
    cancel_at_period_end: sub.cancel_at_period_end === true,
    updated_at: new Date().toISOString(),
  };
}


// Webhook 验签已改用 Web Crypto（见 pages/api/checkout/webhook.js）。