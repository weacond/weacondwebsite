import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import Link from "next/link";

export const metadata = {
  title: "Weacond — 让投资变得轻松、便捷、稳健",
  description:
    "Weacond 专注理性投资教育与 AI 智能系统，三引擎信号（基本面+技术面+波动面），帮助个人投资者建立稳定、系统化的财富思维。",
  keywords: [
    "Weacond", "投资教育", "理性投资", "金融AI", "期权",
    "卖Put", "公允价值", "技术信号", "回测",
    "financial education", "options trading", "AI investing",
  ],
  openGraph: {
    title: "Weacond — 让投资变得轻松、便捷、稳健",
    description: "AI + 量化 + 教育，三位一体的金融决策平台",
    type: "website", locale: "zh_CN", siteName: "Weacond",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weacond — 让投资变得轻松、便捷、稳健",
    description: "AI + 量化 + 教育，三位一体的金融决策平台",
  },
  robots: { index: true, follow: true },
};

export default function Home() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar />
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white py-28 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-8 backdrop-blur">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {L.heroBadge}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight leading-tight">
            {L.heroTitle}
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            {L.heroSubtitle}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/pricing"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/30">
              {L.ctaPricing}
            </Link>
            <Link href="/signals"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-8 rounded-xl transition-all border border-white/20 backdrop-blur">
              {L.ctaSignals}
            </Link>
            <Link href="/backtest"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-8 rounded-xl transition-all border border-white/20 backdrop-blur">
              {L.ctaBacktest}
            </Link>
            <Link href="/ai"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-8 rounded-xl transition-all border border-white/20 backdrop-blur">
              {L.ctaAI}
            </Link>
          </div>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[L.engine1, L.engine2, L.engine3].map((e, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-5 border border-white/10 backdrop-blur text-left">
                <div className="text-2xl mb-2">{["📊","📈","⚡"][i]}</div>
                <h3 className="font-semibold text-white mb-1">{e.title}</h3>
                <p className="text-sm text-slate-400">{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 核心功能 */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">{L.featuresTitle}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {L.features.map((f, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 定价预览 */}
      <section className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4 text-slate-900">{L.pricingTitle}</h2>
          <p className="text-slate-600 mb-10">{L.pricingSubtitle}</p>
          <Link href="/pricing"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
            {L.viewPlans}
          </Link>
        </div>
      </section>

      {/* 理念 + 关于 */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-6 text-slate-900">{L.philosophyTitle}</h2>
        <p className="text-lg text-slate-600 leading-relaxed mb-12">{L.philosophy}</p>
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-left max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-4">{L.aboutTitle}</h3>
          <p className="text-slate-600 leading-relaxed mb-6">{L.about}</p>
          <Link href="/about" className="text-indigo-600 hover:underline text-sm font-medium">{L.moreAbout}</Link>
        </div>
      </section>

      {/* 本地 AI */}
      <section className="bg-gradient-to-r from-indigo-50 to-violet-50 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-6 text-slate-900">{L.localAITitle}</h2>
          <p className="text-slate-600 leading-relaxed mb-8">{L.localAIDesc}</p>
          <div className="flex justify-center gap-4 flex-wrap">
            {["🔒 数据不出本地","⚡ 零推理成本","📱 浏览器/桌面运行","🧠 Qwen 7B/14B"].map((tag, i) => (
              <span key={i} className="bg-white text-sm px-4 py-2 rounded-full shadow-sm border border-slate-200">{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Weacond</h3>
              <p className="text-sm">{L.footerAbout}</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{L.navLinks}</h4>
              <div className="flex flex-col gap-2 text-sm">
                <Link href="/signals" className="hover:text-white">信号仪表盘</Link>
                <Link href="/ebooks" className="hover:text-white">投资书房</Link>
                <Link href="/pricing" className="hover:text-white">定价方案</Link>
                <Link href="/contact" className="hover:text-white">联系我们</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{L.legalLinks}</h4>
              <div className="flex flex-col gap-2 text-sm">
                <Link href="/terms" className="hover:text-white">服务条款</Link>
                <Link href="/privacy" className="hover:text-white">隐私政策</Link>
                <Link href="/about" className="hover:text-white">关于我们</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-6 text-center">
            <p className="text-xs mb-2">{L.disclaimer}</p>
            <p className="text-xs">&copy; {new Date().getFullYear()} Weacond</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const zh = {
  heroBadge: "AI 驱动的金融决策平台",
  heroTitle: "让投资变得轻松、便捷、稳健",
  heroSubtitle: "三引擎信号（基本面+技术面+波动面）· 本地AI推理 · 策略市场 · 任务引导",
  ctaPricing: "查看方案", ctaSignals: "今日信号", ctaBacktest: "策略回测", ctaAI: "AI助手",
  engine1: { title: "基础面", desc: "公允价值模型，识别被低估资产" },
  engine2: { title: "技术面", desc: "突破位/支撑位/趋势评分" },
  engine3: { title: "波动面", desc: "IV Rank / Theta / 黑天鹅对冲" },
  featuresTitle: "核心功能",
  features: [
    { icon: "📊", title: "三引擎信号", desc: "基本面+技术面+波动面合成可解释评分，附数据来源" },
    { icon: "🧠", title: "本地AI", desc: "WebGPU运行Qwen模型，数据永不出本地" },
    { icon: "📚", title: "投资书房", desc: "中英双语电子书，构建理性思维系统" },
    { icon: "📈", title: "回测引擎", desc: "参数化回测，含滑点/佣金/分红假设" },
    { icon: "🎯", title: "任务系统", desc: "3天体验任务引导，完成即解锁高级功能" },
    { icon: "🛡️", title: "黑天鹅模块", desc: "尾部风险检测+对冲建议+教育" },
  ],
  pricingTitle: "灵活定价，按需选择",
  pricingSubtitle: "从免费体验到机构级服务",
  viewPlans: "查看完整方案",
  philosophyTitle: "我们的理念",
  philosophy: "投资应基于数据与逻辑，而非情绪。金融教育是每个人必备的技能。",
  aboutTitle: "关于 Weacond",
  about: "以市场理性为核心，提供AI驱动的信号系统、教育资源和策略工具。",
  moreAbout: "了解更多 →",
  localAITitle: "本地优先，隐私至上",
  localAIDesc: "WebGPU+Qwen模型在你的设备本地运行。交易数据永不上传服务器。",
  footerAbout: "AI驱动的金融决策平台。",
  navLinks: "导航", legalLinks: "法律",
  disclaimer: "免责声明：仅供教育与研究用途，不构成投资建议。",
};

const en = {
  heroBadge: "AI-Powered Financial Decision Platform",
  heroTitle: "Make Investing Simple, Smart, Stable",
  heroSubtitle: "3-Engine Signals · Local AI · Strategy Marketplace · Task-Guided",
  ctaPricing: "View Plans", ctaSignals: "Today's Signals", ctaBacktest: "Backtest", ctaAI: "AI Assistant",
  engine1: { title: "Fundamental", desc: "Fair value model" },
  engine2: { title: "Technical", desc: "Breakout/support scoring" },
  engine3: { title: "Volatility", desc: "IV Rank / Theta / Black Swan" },
  featuresTitle: "Core Features",
  features: [
    { icon: "📊", title: "3-Engine Signals", desc: "Explainable scoring with data sources" },
    { icon: "🧠", title: "Local AI", desc: "WebGPU + Qwen, data stays local" },
    { icon: "📚", title: "Library", desc: "Bilingual ebooks" },
    { icon: "📈", title: "Backtesting", desc: "Slippage, commission, dividends" },
    { icon: "🎯", title: "Task System", desc: "3-day trial, unlock premium" },
    { icon: "🛡️", title: "Black Swan", desc: "Tail risk detection & hedging" },
  ],
  pricingTitle: "Flexible Pricing",
  pricingSubtitle: "From free trial to enterprise",
  viewPlans: "View Full Plans",
  philosophyTitle: "Our Philosophy",
  philosophy: "Investing should be based on data and logic, not emotion.",
  aboutTitle: "About Weacond",
  about: "AI-driven signals, education, and strategy tools for rational investing.",
  moreAbout: "Learn More →",
  localAITitle: "Local-First, Privacy Above All",
  localAIDesc: "WebGPU + Qwen runs on your device. Data never touches a server.",
  footerAbout: "AI-powered financial platform.",
  navLinks: "Navigate", legalLinks: "Legal",
  disclaimer: "For educational purposes only. Not financial advice.",
};
