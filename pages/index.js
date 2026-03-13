import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import Link from "next/link";

export default function Home() {
  const { lang } = useLanguage();

  const t = {
    zh: {
      heroTitle: "让投资变得轻松、方便、稳定",
      heroSubtitle: "Weacond — 专注于理性投资教育与智能化系统",
      explore: "探索电子书",
      philosophyTitle: "我们的理念",
      philosophy: "投资应以数据与逻辑为基础，而非情绪。理财教育是每个人都需要的能力，自动化与智能化是未来的趋势。",
      aboutTitle: "关于 Weacond",
      about: "Weacond 是一个以市场理性为核心的项目，致力帮助个人投资者建立稳定系统化的财富思维。",
      contact: "联系: weacond@gmail.com"
    },
    en: {
      heroTitle: "Make investing easy, convenient, and stable",
      heroSubtitle: "Weacond — focused on rational investment education & intelligent systems",
      explore: "Explore Ebooks",
      philosophyTitle: "Our Philosophy",
      philosophy: "Investing should be based on data and logic, not emotion. Financial education is a skill everyone needs. Automation and intelligence are the future.",
      aboutTitle: "About Weacond",
      about: "Weacond is a project centered on market rationality, helping individuals build stable systematic wealth thinking.",
      contact: "Contact: weacond@gmail.com"
    }
  }[lang];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20">
        <section className="bg-gradient-to-br from-primary to-accent text-white py-28">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t.heroTitle}</h1>
            <p className="text-lg md:text-xl opacity-90 mb-8">{t.heroSubtitle}</p>
            <Link href="/ebooks">
              <a className="inline-block bg-white text-primary font-semibold px-6 py-3 rounded-lg shadow hover:scale-105 transition">
                {t.explore}
              </a>
            </Link>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold mb-3">{t.philosophyTitle}</h2>
          <p className="text-gray-700 mb-8 whitespace-pre-line">{t.philosophy}</p>

          <h2 className="text-2xl font-bold mb-3">{t.aboutTitle}</h2>
          <p className="text-gray-700 mb-6">{t.about}</p>

          <p className="text-sm text-gray-500">{t.contact}</p>
        </section>
      </main>
    </div>
  );
}
