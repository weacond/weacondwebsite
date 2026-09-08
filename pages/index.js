import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import Link from "next/link";

export default function Home() {
  const { lang } = useLanguage();

  // 恢复你的原始文案，并进行了专业的翻译和排版
  const t = {
    zh: {
      heroTitle: "让投资变得轻松、便捷、稳健",
      heroSubtitle: "Weacond — 专注于理性投资教育与智能系统",
      cta: "探索电子书",
      philosophyTitle: "我们的理念",
      philosophy: "投资应基于数据与逻辑，而非情绪。金融教育是每个人必备的技能。自动化与智能化是未来的趋势。",
      aboutTitle: "关于 Weacond",
      about: "Weacond 是一个以市场理性为核心的项目，致力于帮助个人投资者建立稳定、系统化的财富思维。",
      contact: "联系: weacond@gmail.com",
      disclaimer: "免责声明：本站内容仅供教育与研究用途，不构成任何投资建议。"
    },
    en: {
      heroTitle: "Make investing easy, convenient, and stable",
      heroSubtitle: "Weacond — focused on rational investment education & intelligent systems",
      cta: "Explore Ebooks",
      philosophyTitle: "Our Philosophy",
      philosophy: "Investing should be based on data and logic, not emotion. Financial education is a skill everyone needs. Automation and intelligence are the future.",
      aboutTitle: "About Weacond",
      about: "Weacond is a project centered on market rationality, helping individuals build stable systematic wealth thinking.",
      contact: "Contact: weacond@gmail.com",
      disclaimer: "Disclaimer: Content is for educational and research purposes only. Not financial advice."
    }
  }[lang];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar />
      
      {/* Hero Section: 使用 Slate-900 (深石板蓝) 背景，专业且沉稳 */}
      <section className="bg-slate-900 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight text-slate-50">
            {t.heroTitle}
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t.heroSubtitle}
          </p>
          
          {/* CTA 按钮: 使用 Indigo-600 (柔和靛蓝) */}
          <Link 
            href="/ebooks" 
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-indigo-500/20 transform hover:-translate-y-1"
          >
            {t.cta}
          </Link>
        </div>
      </section>

      {/* Philosophy Section: 恢复你的原始内容 */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-6 text-slate-900">{t.philosophyTitle}</h2>
        <p className="text-lg text-slate-600 leading-relaxed">
          {t.philosophy}
        </p>
      </section>

      {/* About Section: 恢复你的原始内容 */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-slate-900">{t.aboutTitle}</h2>
          <p className="text-lg text-slate-600 leading-relaxed mb-8">
            {t.about}
          </p>
          <p className="text-slate-500 font-medium">{t.contact}</p>
        </div>
      </section>

      {/* Footer: 包含版权和必要的免责声明 */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-center">
        <p className="text-sm mb-2">{t.disclaimer}</p>
        <p className="text-xs">&copy; 2024 Weacond. All rights reserved.</p>
      </footer>
    </div>
  );
}
