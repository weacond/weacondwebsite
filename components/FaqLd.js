// components/FaqLd.js — 在 <Head> 注入 FAQPage JSON-LD（纯函数，SSR/Edge 安全，可单测）
// 反幻觉原则：仅渲染页面真实展示的问答，不编造；空数组时产空 mainEntity 不报错。
// 用法：在页面中放 <FaqLd questions={L.faqs} />，与可见的 FAQ 区内容保持一致。
import Head from "next/head";
import { faqLd, toScript } from "../lib/jsonLd";

export default function FaqLd({ questions = [] }) {
  const script = toScript(faqLd(questions));
  return <Head dangerouslySetInnerHTML={{ __html: script }} />;
}
