import { useState } from 'react';
import Navbar from '../components/Navbar';

export default function Home() {
  const [lang, setLang] = useState('zh');

  const texts = {
    zh: {
      mission: "让投资变得轻松、方便、稳定",
      concept: "投资应以数据和逻辑为基础，而非情绪。\n理财教育是每个人都需要的能力。\n自动化与智能化是未来的趋势。",
      about: "Weacond 是一个年轻的金融理念项目，由对市场理性思维充满热情的团队创建。我们的目标是帮助个人投资者建立稳定、系统化的财富思维。",
      contact: "邮箱: weacond@gmail.com",
      button: "探索电子书",
      coming: "更多内容 Coming Soon"
    },
    en: {
      mission: "Make investing easy, convenient, and stable",
      concept: "Investing should be based on data and logic, not emotions.\nFinancial education is a skill everyone needs.\nAutomation and intelligence are the future.",
      about: "Weacond is a young financial philosophy project created by a team passionate about rational market thinking. Our goal is to help individual investors build stable and systematic wealth thinking.",
      contact: "Email: weacond@gmail.com",
      button: "Explore Ebooks",
      coming: "More content Coming Soon"
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar lang={lang} setLang={setLang} />

      <header className="bg-gradient-to-r from-primary to-secondary text-white h-screen flex flex-col justify-center items-center text-center px-6">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fadeIn">{texts[lang].mission}</h1>
        <a href="/ebooks" className="mt-6 px-8 py-4 bg-white text-primary font-bold rounded-lg shadow-lg hover:shadow-2xl hover:scale-105 transition transform">{texts[lang].button}</a>
      </header>

      <section className="py-16 px-6 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">{lang === 'zh' ? '我们的理念' : 'Our Philosophy'}</h2>
        <p className="whitespace-pre-line text-gray-700 text-lg">{texts[lang].concept}</p>
      </section>

      <section className="py-16 px-6 max-w-4xl mx-auto bg-gray-100 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold mb-6">{lang === 'zh' ? '关于 Weacond' : 'About Weacond'}</h2>
        <p className="text-gray-700 text-lg">{texts[lang].about}</p>
      </section>

      <section className="py-16 px-6 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-4">{lang === 'zh' ? '联系' : 'Contact'}</h2>
        <p className="text-gray-700">{texts[lang].contact}</p>
        <p className="text-gray-500 mt-2">{texts[lang].coming}</p>
      </section>
    </div>
  );
}
