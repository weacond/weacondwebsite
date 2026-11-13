// lib/jsonLd.js — 结构化数据(JSON-LD)生成器（纯函数，SSR/Edge 安全，可单测）
//
// 供 SEO：Organization / WebApplication / SoftwareApplication / FAQPage / BreadcrumbList。
// 反幻觉原则：绝不编造评分/评论数/价格——无真实数据时省略对应字段（如 aggregateRating）。

const SITE = "https://weacond.com";

// 组织主体
export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Weacond",
    url: SITE,
    description: "AI + 量化 + 教育三位一体的金融决策平台。",
  };
}

// 整个网站（WebApplication）——不填 aggregateRating，避免编造评分。
export function webApplicationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Weacond",
    url: SITE,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web (browser, WebGPU)",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "三引擎信号（基本面公允价值 + 技术面突破 + 波动率）、回测、本地 AI、67 个金融计算工具。教育性参考，非投资建议。",
  };
}

// 单个计算器的 SoftwareApplication（供 /calculators 与各工具页复用）
export function softwareLd(tool) {
  const t = tool || {};
  const name = t.titleEn || t.title || "Tool";
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `Weacond — ${name}`,
    url: `${SITE}${t.href || "/"}`,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: t.descEn || t.desc || "",
  };
}

// FAQPage（q/a 或 question/answer 两种写法都接受）
export function faqLd(questions = []) {
  const mainEntity = Array.isArray(questions)
    ? questions.map((q) => ({
        "@type": "Question",
        name: q.q || q.question,
        acceptedAnswer: { "@type": "Answer", text: q.a || q.answer },
      }))
    : [];
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity };
}

// BreadcrumbList（items: [{ name, href }]）
export function breadcrumbLd(items = []) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: Array.isArray(items)
      ? items.map((it, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: it.name,
          item: `${SITE}${it.href || "/"}`,
        }))
      : [],
  };
}

// 把 1..N 个对象拼成合法 JSON-LD 字符串（单对象用单对象，多对象用数组）
export function toLdString(objs = []) {
  const arr = (Array.isArray(objs) ? objs : [objs]).filter(Boolean);
  return JSON.stringify(arr.length === 1 ? arr[0] : arr);
}

// 转 <script> 字符串（转义 '<' 防注入 + 防 </script> 闭合）
export function toScript(objs = []) {
  const s = toLdString(objs);
  return `<script type="application/ld+json">${s.replace(/</g, "\\u003c")}</script>`;
}

export default toLdString;
