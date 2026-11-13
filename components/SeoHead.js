"use client";

// components/SeoHead.js — 渲染 Open Graph / Twitter / canonical 元数据。
// 复用 lib/seo.js 的纯函数，避免各页手写、口径不一。
import { openGraphMeta, metaTagAttrs } from "../lib/seo.js";

export default function SeoHead({ title, description, path, type = "website" }) {
  const metas = openGraphMeta({ title, description, path, type });
  return (
    <>
      {metas.map((m) => {
        const a = metaTagAttrs(m);
        if (a.rel === "canonical") return <link key={a.key} rel="canonical" href={a.href} />;
        return <meta key={a.key} property={a.property} name={a.name} content={a.content} />;
      })}
    </>
  );
}
