// components/FaqSection.js — 可见的"常见问题"区块（与 FaqLd 的 FAQPage JSON-LD 内容保持一致）
// 反幻觉原则：只渲染页面真实展示的问答；非数组 / 空数组时返回 null，避免空区块。
// 用法：<FaqSection faqs={L.faqs} title={L.faqTitle} />
export default function FaqSection({ faqs = [], title }) {
  const items = Array.isArray(faqs) ? faqs : [];
  if (items.length === 0) return null;
  return (
    <section className="mt-8 border-t border-slate-200 pt-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <dl className="space-y-4">
        {items.map((f, i) => (
          <div key={i} className="text-sm">
            <dt className="font-medium text-slate-800">{f.q}</dt>
            <dd className="text-slate-500 mt-1">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
