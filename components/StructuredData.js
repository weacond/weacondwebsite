// components/StructuredData.js — 把 JSON-LD 注入 <head>（next/head，SSR 即写入初始 HTML）
import Head from "next/head";
import { toLdString } from "../lib/jsonLd";

// 用法：<StructuredData data={[webApplicationLd(), faqLd([...])]} />
export default function StructuredData({ data = [] }) {
  const arr = Array.isArray(data) ? data : [data];
  const s = toLdString(arr.filter(Boolean)).replace(/</g, "\\u003c");
  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: s }}
      />
    </Head>
  );
}
