"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import { groupedPath, totalMinutes, LEARNING_PATH } from "../lib/learningPath";

export const metadata = {
  title: "量化学习路径 — Weacond",
  description: "一条循序渐进的路径：入门→进阶→高级，串联支点/头寸/组合/风险/蒙特卡洛等工具。",
  robots: { index: true, follow: true },
};

export default function LearningPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const groups = groupedPath();
  let step = 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-2">{L.subtitle}</p>
          <p className="text-xs text-slate-400 mb-8">
            {LEARNING_PATH.length} {L.modules} · {totalMinutes()} {L.minutes}
          </p>

          {groups.map((g) => (
            <div key={g.level} className="mb-8">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-indigo-500 rounded-full inline-block" />
                {lang === "en" ? g.labelEn : g.label}
              </h2>
              <div className="space-y-3">
                {g.modules.map((m) => {
                  step += 1;
                  return (
                    <Link
                      key={m.id}
                      href={m.tool}
                      className="flex items-start gap-3 bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:border-indigo-400 transition"
                    >
                      <span className="shrink-0 w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 font-bold text-sm flex items-center justify-center mt-0.5">
                        {step}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{lang === "en" ? m.titleEn : m.title}</span>
                          <span className="text-[10px] text-slate-400">{m.estMin} min</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">{lang === "en" ? m.descEn : m.desc}</p>
                      </div>
                      <span className="text-slate-300 mt-1">→</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <p className="text-center text-xs text-slate-400 mt-4">
            <Link href="/glossary" className="text-indigo-500 hover:underline">→ {L.linkGlossary}</Link>
            {" · "}
            <Link href="/calculators" className="text-indigo-500 hover:underline">→ {L.linkHub}</Link>
          </p>
          <p className="text-center text-xs text-slate-400 mt-4">{L.disclaimer}</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "量化学习路径",
  subtitle: "一条循序渐进的路径，把站内工具串成一条从入门到高级的完整学习旅程。",
  modules: "个模块",
  minutes: "分钟",
  linkGlossary: "概念词典",
  linkHub: "全部工具",
  disclaimer: "建议按编号顺序学习；每个模块链接到对应工具页，可边学边练。本路径为教学建议，不构成投资建议。",
};
const en = {
  title: "Quant Learning Path",
  subtitle: "A guided path that turns the site's tools into a complete journey from beginner to advanced.",
  modules: "modules",
  minutes: "min",
  linkGlossary: "Glossary",
  linkHub: "All Tools",
  disclaimer: "Follow the numbered order; each module links to its tool so you can learn by doing. A learning suggestion, not investment advice.",
};

