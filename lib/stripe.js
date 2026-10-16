import Stripe from "stripe";
import { generateSignedUrl } from "./r2";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia", typescript: false,
});

/** 25 本电子书目录 */
export const BOOK_CATALOG = [
  { id:"paid-23", slug:"rational-101", title_cn:"理性投资入门", title_en:"Rational Investing 101", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-24", slug:"behavioral-biases", title_cn:"行为偏差识别", title_en:"Behavioral Biases", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-25", slug:"macro-basics", title_cn:"宏观经济基础", title_en:"Macro Economics Basics", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-01", slug:"equity-pricing", title_cn:"股票定价模型", title_en:"Equity Pricing Models", price_cents:700, category:"advanced", type:"paid" },
  { id:"paid-02", slug:"risk-management", title_cn:"风险管理框架", title_en:"Risk Management Framework", price_cents:700, category:"advanced", type:"paid" },
  { id:"paid-03", slug:"portfolio-theory", title_cn:"投资组合理论", title_en:"Portfolio Theory", price_cents:700, category:"advanced", type:"paid" },
  { id:"paid-04", slug:"options-strategies", title_cn:"期权策略手册", title_en:"Options Strategies", price_cents:700, category:"derivatives", type:"paid" },
  { id:"paid-05", slug:"futures-trading", title_cn:"期货交易实务", title_en:"Futures Trading", price_cents:700, category:"derivatives", type:"paid" },
  { id:"paid-06", slug:"quant-coding", title_cn:"量化编程基础", title_en:"Quantitative Coding", price_cents:700, category:"quant", type:"paid" },
  { id:"paid-07", slug:"backtesting", title_cn:"回测方法论", title_en:"Backtesting Methodology", price_cents:700, category:"quant", type:"paid" },
  { id:"paid-08", slug:"market-microstructure", title_cn:"市场微观结构", title_en:"Market Microstructure", price_cents:700, category:"advanced", type:"paid" },
  { id:"paid-09", slug:"fixed-income", title_cn:"固定收益分析", title_en:"Fixed Income Analysis", price_cents:700, category:"bonds", type:"paid" },
  { id:"paid-10", slug:"reits", title_cn:"REITs 投资", title_en:"REITs Investing", price_cents:700, category:"alternative", type:"paid" },
  { id:"paid-11", slug:"crypto-investing", title_cn:"加密货币投资", title_en:"Crypto Investing", price_cents:700, category:"alternative", type:"paid" },
  { id:"paid-12", slug:"emerging-markets", title_cn:"新兴市场", title_en:"Emerging Markets", price_cents:700, category:"global", type:"paid" },
  { id:"paid-13", slug:"etf-guide", title_cn:"ETF 完全指南", title_en:"ETF Complete Guide", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-14", slug:"tax-optimization", title_cn:"税务优化", title_en:"Tax Optimization", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-15", slug:"retirement-planning", title_cn:"退休规划", title_en:"Retirement Planning", price_cents:700, category:"personal", type:"paid" },
  { id:"paid-16", slug:"asset-allocation", title_cn:"资产配置", title_en:"Asset Allocation", price_cents:700, category:"advanced", type:"paid" },
  { id:"paid-17", slug:"index-investing", title_cn:"指数投资", title_en:"Index Investing", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-18", slug:"value-investing", title_cn:"价值投资", title_en:"Value Investing", price_cents:700, category:"basics", type:"paid" },
  { id:"paid-19", slug:"momentum-trading", title_cn:"动量交易", title_en:"Momentum Trading", price_cents:700, category:"advanced", type:"paid" },
  { id:"paid-20", slug:"event-driven", title_cn:"事件驱动策略", title_en:"Event-Driven Strategies", price_cents:700, category:"quant", type:"paid" },
  { id:"paid-21", slug:"high-frequency", title_cn:"高频交易入门", title_en:"HFT Introduction", price_cents:700, category:"quant", type:"paid" },
  { id:"paid-22", slug:"black-swan", title_cn:"黑天鹅应对", title_en:"Black Swan Response", price_cents:700, category:"advanced", type:"paid" },
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

/** 创建 Checkout Session */
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
        currency: "usd",
      },
      quantity: 1,
    }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://weacond.com"}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://weacond.com"}/ebooks?cancelled=true`,
    metadata: { slug: bookSlug, email, is_bundle: String(isBundle), amount_cents: String(book.price_cents), locale },
  };
  return stripe.checkout.sessions.create(params);
}

/** 根据 slug 查 R2 key */
export function getR2Key(slug) { return `content/${slug}.md`; }

/** 获取私有内容签名 URL（1小时有效） */
export async function getSignedContentUrl(slug) {
  return generateSignedUrl(getR2Key(slug), 3600);
}

export { stripe };

/** 返回 Stripe 实例（供 webhook 等需要手动调用的地方） */
export function getStripe() {
  return stripe;
}