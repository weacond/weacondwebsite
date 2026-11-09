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
function serializeStripeParams(obj, prefix = "") {
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        parts.push(...serializeStripeParams(v[i], `${key}[${i}]`));
      }
    } else if (typeof v === "object") {
      parts.push(...serializeStripeParams(v, key));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.join("&");
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
// Webhook 验签已改用 Web Crypto（见 pages/api/checkout/webhook.js）。