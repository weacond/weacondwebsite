"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import { search, indexStats } from "../lib/search";

export const metadata = {
  title: "全站搜索 — Weacond",
  description: "搜索工具与量化概念：输入关键字，实时匹配工具与词典。",
  robots: { index: true, follow: true },
};

export default function SearchPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [q, setQ] = useState("");

  const results = useMemo(() => search(q, lang), [q, lang]);
  const stats = useMemo(() => indexStats(), []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="relative mb-6">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={L.placeholder}
              aria-label={L.placeholder}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          <p className="text-xs text-slate-400 mb-4">
            {L.stats(stats.total, stats.tools, stats.terms)}
          </p>

          {q.trim() === "" ? (
            <p className="text-sm text-slate-400 text-center py-8">{L.idle}</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">{L.noResult}</p>
          ) : (
            <ul className="space-y-2">
              {results.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <Link href={item.href}
                    className="block bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:border-indigo-300 transition">
                    <div className="flex items-center gap-2">
                      <span>{item.icon || "🔗"}</span>
                      <span className="font-semibold text-slate-800">
                        {lang === "en" ? item.titleEn : item.title}
                      </span>
                      <span className="ml-auto text-xs text-slate-400">
                        {item.type === "tool" ? L.tagTool : L.tagTerm}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {lang === "en" ? item.descEn : item.desc}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "全站搜索",
  subtitle: "搜索工具与量化概念：输入关键字，实时匹配工具与词典。",
  placeholder: "搜索：夏普、对冲、蒙特卡洛…",
  stats: (total, tools, terms) => `共 ${total} 条可搜索：${tools} 个工具 + ${terms} 个概念`,
  idle: "输入关键字开始搜索",
  noResult: "无匹配结果，试试其它关键字。",
  tagTool: "工具",
  tagTerm: "概念",
};
const en = {
  title: "Search",
  subtitle: "Search tools and quant concepts: type a keyword for live matches across tools and the glossary.",
  placeholder: "Search: Sharpe, hedge, Monte Carlo…",
  stats: (total, tools, terms) => `${total} searchable: ${tools} tools + ${terms} concepts`,
  idle: "Type a keyword to start searching",
  noResult: "No matches. Try another keyword.",
  tagTool: "Tool",
  tagTerm: "Concept",
};
