"use client";
import Link from "next/link";
import { useLanguage } from "../contexts/LanguageContext";
import { crossLinksFor } from "../lib/crossLinks";

// 计算器页底部「深入相关」区块：相关概念 / AI 可调用(MCP) / 可对比兄弟。
// 无任何交叉链接时返回 null（不渲染空区块）；双语。
export default function CrossLinks({ slug }) {
  const { lang } = useLanguage();
  const en = lang === "en";
  const c = crossLinksFor(slug);
  if (c.concepts.length + c.mcp.length + c.compare.length === 0) return null;

  const pill =
    "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition text-slate-700 hover:text-indigo-600";

  return (
    <section className="pt-8 border-t border-slate-100">
      <h2 className="text-sm font-semibold text-slate-500 mb-3">
        {en ? "Go deeper" : "深入相关"}
      </h2>
      <div className="space-y-3">
        {c.concepts.length > 0 && (
          <div>
            <div className="text-xs text-slate-400 mb-1.5">
              {en ? "Related concepts" : "相关概念"}
            </div>
            <div className="flex flex-wrap gap-2">
              {c.concepts.map((x) => (
                <Link key={x.id} href={x.href} className={pill}>
                  {en ? x.termEn : x.term}
                </Link>
              ))}
            </div>
          </div>
        )}
        {c.mcp.length > 0 && (
          <div>
            <div className="text-xs text-slate-400 mb-1.5">
              {en ? "Use it in your AI agent (MCP)" : "在 AI agent 里调用（MCP）"}
            </div>
            <div className="flex flex-wrap gap-2">
              {c.mcp.map((x) => (
                <Link key={x.name} href={x.href} className={pill}>
                  <code>{x.name}</code>
                  <span className="text-slate-400">· {en ? x.titleEn : x.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
        {c.compare.length > 0 && (
          <div>
            <div className="text-xs text-slate-400 mb-1.5">
              {en ? "Compare with" : "对比"}
            </div>
            <div className="flex flex-wrap gap-2">
              {c.compare.map((x) => (
                <Link key={x.slug} href={x.href} className={pill}>
                  {en ? x.labelEn : x.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}