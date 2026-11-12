"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import { groupedGlossary, GLOSSARY } from "../lib/glossary";

export const metadata = {
  title: "量化概念词典 — Weacond",
  description: "风险/收益/组合/期权/凯利核心概念的中英定义，并链接到对应计算工具。教育性参考。",
  robots: { index: true, follow: true },
};

export default function GlossaryPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const groups = groupedGlossary();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-8">
            {L.subtitle} <span className="text-xs text-slate-400">{GLOSSARY.length} {L.terms}</span>
          </p>

          {groups.map((g) => (
            <div key={g.category} className="mb-8">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-indigo-500 rounded-full inline-block" />
                {lang === "en" ? g.labelEn : g.label}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {g.terms.map((t) => (
                  <div key={t.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800">{lang === "en" ? t.termEn : t.term}</span>
                      {t.related && (
                        <Link href={t.related} className="text-xs text-indigo-500 hover:text-indigo-700">
                          {L.open} →
                        </Link>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 leading-snug">{lang === "en" ? t.defEn : t.def}</p>
                  </div>
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
  title: "量化概念词典",
  subtitle: "风险、收益、组合、期权、凯利等核心概念的中英定义，每个概念可跳转到对应计算工具。",
  terms: "个概念",
  open: "查看工具",
  disclaimer: "本词典为教学参考，定义经简化；具体计算口径见各工具页。不构成投资建议。",
};
const en = {
  title: "Quant & Finance Glossary",
  subtitle: "Bilingual definitions of core risk, returns, portfolio, options & Kelly concepts — each links to its calculator.",
  terms: "terms",
  open: "Open tool",
  disclaimer: "This glossary is an educational reference; definitions are simplified. See each tool page for exact conventions. Not investment advice.",
};
