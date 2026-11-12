"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import { groupedTools, TOOLS } from "../lib/toolsIndex";

export const metadata = {
  title: "计算工具集 — Weacond",
  description: "Weacond 量化计算工具集：支点/斐波那契、头寸&Kelly、组合优化/相关性/蒙特卡洛、风险仪表盘、期权与卖 Put。双语、可交互、非投资建议。",
  robots: { index: true, follow: true },
};

export default function CalculatorsPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const groups = groupedTools();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-8">
            {L.subtitle} <span className="text-xs text-slate-400">{TOOLS.length} {L.tools}</span>
          </p>

          {groups.map((g) => (
            <div key={g.category} className="mb-8">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-indigo-500 rounded-full inline-block" />
                {lang === "en" ? g.labelEn : g.label}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {g.tools.map((t) => (
                  <Link
                    key={t.id}
                    href={t.href}
                    className="group bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{t.icon}</span>
                      <span className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {lang === "en" ? t.titleEn : t.title}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 leading-snug">{lang === "en" ? t.descEn : t.desc}</p>
                    <span className="inline-block text-xs text-indigo-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {t.href} →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <p className="mt-8 text-center text-xs text-slate-400">{L.disclaimer}</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "计算工具集",
  subtitle: "Weacond 的量化计算与分析工具，按类别组织。每个工具可交互、双语，用于教学演示。",
  tools: "个工具",
  disclaimer: "所有工具均为教育演示，参数为示意性估计，不构成投资建议。",
};
const en = {
  title: "Calculators & Tools",
  subtitle: "Weacond's quantitative calculators & analysis tools, organized by category. Each is interactive, bilingual, and for education only.",
  tools: "tools",
  disclaimer: "All tools are educational demonstrations with illustrative parameters, not investment advice.",
};
