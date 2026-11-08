"use client";

/**
 * 全站通用页脚 — 含免责声明 + 法律链接。
 *
 * 合规要求（手册 §4 法律、合规与风控）：
 *   "每页策略/信号页必须展示免责声明：本平台为教育与参考用途，不构成投资建议。"
 * 本页脚统一在 signals / backtest / black-swan / ai / dashboard / ebooks 等
 * 策略相关页面底部展示，确保任一页面都满足该要求。
 */

import Link from "next/link";
import { useLanguage } from "../contexts/LanguageContext";

const zh = {
  about: "AI 驱动的金融决策平台。三引擎信号 · 本地 AI · 投资教育。",
  navLinks: "导航",
  legalLinks: "法律与合规",
  home: "主页",
  signals: "今日信号",
  ebooks: "投资书房",
  backtest: "策略回测",
  pricing: "定价方案",
  ai: "本地 AI",
  terms: "服务条款",
  privacy: "隐私政策",
  aboutPage: "关于我们",
  contact: "联系我们",
  disclaimer:
    "免责声明：Weacond 提供的所有内容、信号、策略、回测结果与 AI 输出，仅供教育与研究用途，不构成投资、财务或法律建议，亦不代表平台对任何资产做出买卖推荐。历史回测结果不代表未来表现。市场有风险，投资须谨慎，请自行独立判断。",
  rights: "保留所有权利",
};

const en = {
  about: "AI-powered financial decision platform. 3-engine signals · Local AI · Investing education.",
  navLinks: "Navigate",
  legalLinks: "Legal & Compliance",
  home: "Home",
  signals: "Signals",
  ebooks: "Library",
  backtest: "Backtest",
  pricing: "Pricing",
  ai: "Local AI",
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  aboutPage: "About",
  contact: "Contact",
  disclaimer:
    "Disclaimer: All content, signals, strategies, backtest results and AI outputs on Weacond are for educational and research purposes only. They do not constitute investment, financial, or legal advice, and do not represent a recommendation to buy or sell any asset. Past performance does not guarantee future results. Markets are risky; please invest at your own discretion.",
  rights: "All rights reserved",
};

export default function Footer() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 mt-20">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="text-xl font-extrabold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent mb-2">
              Weacond
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{L.about}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3 text-slate-200">{L.navLinks}</h4>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
              <Link href="/" className="hover:text-white transition-colors">{L.home}</Link>
              <Link href="/signals" className="hover:text-white transition-colors">{L.signals}</Link>
              <Link href="/ebooks" className="hover:text-white transition-colors">{L.ebooks}</Link>
              <Link href="/backtest" className="hover:text-white transition-colors">{L.backtest}</Link>
              <Link href="/ai" className="hover:text-white transition-colors">{L.ai}</Link>
              <Link href="/pricing" className="hover:text-white transition-colors">{L.pricing}</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3 text-slate-200">{L.legalLinks}</h4>
            <div className="space-y-2 text-sm">
              <Link href="/terms" className="block hover:text-white transition-colors">{L.terms}</Link>
              <Link href="/privacy" className="block hover:text-white transition-colors">{L.privacy}</Link>
              <Link href="/about" className="block hover:text-white transition-colors">{L.aboutPage}</Link>
              <Link href="/contact" className="block hover:text-white transition-colors">{L.contact}</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-700 pt-6">
          <p className="text-xs text-amber-300/80 leading-relaxed mb-3">{L.disclaimer}</p>
          <p className="text-xs text-slate-500 text-center">
            © {year} Weacond. {L.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
