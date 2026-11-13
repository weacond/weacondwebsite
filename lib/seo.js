// lib/seo.js — SEO/社交元数据纯函数生成器（SSR/Edge 安全，可单测）
//
// 手册 §SEO：集中生成 Open Graph / Twitter Card / canonical / robots 元数据，
// 供各旗舰页的 <Head> 复用，避免每页手写、口径不一。

const DEFAULT_SITE = "Weacond";

// canonical URL（确保前斜杠、去尾斜杠、去 query/hash；首页为根）。
export function canonicalUrl(path, baseUrl = "https://weacond.com") {
  let p = String(path || "/");
  // 去 query/hash
  p = p.split("?")[0].split("#")[0];
  // 去尾斜杠
  p = p.replace(/\/+$/, "");
  // 确保前斜杠
  if (!p.startsWith("/")) p = "/" + p;
  if (p === "") p = "/";
  return p === "/" ? baseUrl : baseUrl + p;
}

// Open Graph + Twitter + canonical 的 <meta> 属性数组（直接展开进 <Head>）。
// 零幻觉：不写 fake price/rating；og:type 为 website，article 才用 article。
export function openGraphMeta({
  title,
  description,
  path,
  type = "website",
  baseUrl = "https://weacond.com",
  siteName = DEFAULT_SITE,
} = {}) {
  const url = canonicalUrl(path, baseUrl);
  const desc = description || "";
  return [
    // canonical
    { key: "canonical", rel: "canonical", href: url },
    // Open Graph
    { key: "og:title", property: "og:title", content: `${title} — ${siteName}` },
    { key: "og:description", property: "og:description", content: desc },
    { key: "og:type", property: "og:type", content: type },
    { key: "og:url", property: "og:url", content: url },
    { key: "og:site_name", property: "og:site_name", content: siteName },
    // Twitter
    {
      key: "twitter:card",
      name: "twitter:card",
      content: "summary_large_image",
    },
    { key: "twitter:title", name: "twitter:title", content: `${title} — ${siteName}` },
    {
      key: "twitter:description",
      name: "twitter:description",
      content: desc,
    },
  ];
}

// 把 openGraphMeta 的数组映射为 <Head> 里的 JSX 元素（区分 rel/property/name）。
// 纯函数返回“描述”，实际 JSX 由调用方渲染，避免在本层引入 React 依赖。
export function metaTagAttrs(m) {
  const base = { key: m.key };
  if (m.rel) base.rel = m.rel;
  if (m.property) base.property = m.property;
  if (m.name) base.name = m.name;
  if (m.href) base.href = m.href;
  if (m.content != null) base.content = m.content;
  return base;
}

// 简单校验：是否含必需 OG 字段（供测试 / 自检）。
export function hasRequiredOg(metas = []) {
  const keys = new Set(metas.map((m) => m.key));
  return ["og:title", "og:description", "og:url", "canonical"].every((k) =>
    keys.has(k)
  );
}

export default openGraphMeta;
