// 404 page — bilingual, with Navbar/Footer + helpful jump links
"use client";
import Head from "next/head";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";

const zh = {
  big: "404",
  title: "页面未找到",
  desc: "你访问的页面不存在或已被移动。试试下方入口：",
  home: "返回首页",
  signals: "今日信号",
  ebooks: "浏览电子书",
};
const en = {
  big: "404",
  title: "Page Not Found",
  desc: "The page you are looking for doesn't exist or has moved. Try one of these:",
  home: "Back to Home",
  signals: "Today's Signals",
  ebooks: "Browse Ebooks",
};

export default function NotFound() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <Head>
        <title>{L.title} — Weacond</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center">
          <div className="text-8xl font-black text-indigo-100 mb-4">{L.big}</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">{L.desc}</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href='/' className='bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 transition-colors'>{L.home}</Link>
            <Link href='/signals' className='bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-lg font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-colors'>{L.signals}</Link>
            <Link href='/ebooks' className='bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-lg font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-colors'>{L.ebooks}</Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
