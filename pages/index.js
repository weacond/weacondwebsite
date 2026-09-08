import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import Link from "next/link";

export default function Home() {
  const { lang } = useLanguage();

  // 合规文案配置：强调“教育”与“研究”，规避“交易建议”
  const t = {
    zh: {
      heroTitle: "构建理性的投资思维",
      heroSubtitle: "Weacond — 您的金融研究与决策知识库。基于数据与逻辑，而非情绪。",
      cta: "浏览知识库",
      features: [
        {
          title: "深度研究",
          desc: "20+ 精选经典著作，提供中英双语对照，深度解析市场逻辑。"
        },
        {
          title: "客观中立",
          desc: "不预测涨跌，只提供事实与数据。帮助您建立独立的判断体系。"
        },
        {
          title: "系统化教育",
          desc: "从基础理论到高级策略，构建完整的金融知识框架。"
        }
      ],
      disclaimer: "免责声明：本站内容仅供教育与研究用途，不构成任何投资建议。"
    },
    en: {
      heroTitle: "Build Rational Investment Thinking",
      heroSubtitle: "Weacond — Your knowledge base for financial research & decision support. Based on data, not emotion.",
      cta: "Explore Library",
      features: [
        {
          title: "In-Depth Research",
          desc: "20+ curated classics with bilingual support, analyzing market logic deeply."
        },
        {
          title: "Objective & Neutral",
          desc: "No predictions, just facts and data. Help you build an independent judgment system."
        },
        {
          title: "Systematic Education",
          desc: "From fundamental theory to advanced strategies, build a complete financial framework."
        }
      ],
      disclaimer: "Disclaimer: Content is for educational and research purposes only. Not financial advice."
    }
  }[lang];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar />
      
      {/* Hero Section: 使用 Slate-900 (深石板蓝) 传达专业与中立 */}
      <section className="bg-slate-900 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight text-slate-50">
            {t.heroTitle}
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t.heroSubtitle}
          </p>
          
          {/* CTA 按钮: 使用 Indigo-600 (柔和靛蓝) 代表智慧与行动 */}
          <Link 
            href="/ebooks" 
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-indigo-500/20 transform hover:-translate-y-1"
          >
            {t.cta}
          </Link>
        </div>
      </section>

      {/* Features Section: 简洁卡片，强调核心价值 */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {t.features.map((feature, idx) => (
            <div key={idx} className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4 text-indigo-600">
                {/* 书籍/研究图标 */}
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-800">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer: 必须包含免责声明 */}
      <footer className="bg-white border-t border-slate-200 py-12 text-center">
        <p className="text-slate-500 text-sm mb-2">{t.disclaimer}</p>
        <p className="text-slate-400 text-xs">&copy; 2024 Weacond. All rights reserved.</p>
      </footer>
    </div>
  );
}
