'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  const content = {
    zh: {
      logic: "让投资变得轻松、方便、稳定。我们相信，稳定与理性才是真正的力量。",
      mission: "构建理性投资的教育与智能化系统，让每个人都能理解财富增长的本质。",
      btn: "我的业务",
      nav_biz: "我的业务",
      nav_lib: "电子书库"
    },
    en: {
      logic: "Making investing easy, convenient, and stable. We believe stability and rationality are true power.",
      mission: "Building education and intelligent systems for rational investing, helping everyone understand the essence of wealth growth.",
      btn: "MY BUSINESS",
      nav_biz: "BUSINESS",
      nav_lib: "LIBRARY"
    }
  };

  return (
    <div className="bg-[#050505] text-white min-h-screen font-sans selection:bg-blue-600 overflow-hidden">
      {/* 顶部免责声明 */}
      <div className="fixed top-0 w-full bg-white/5 backdrop-blur-md py-3 text-[10px] text-center text-white/30 z-[100] tracking-[0.3em] uppercase px-4">
        Disclaimer: For educational purposes only. Not financial advice.
      </div>

      {/* 右上角语言切换 */}
      <div className="fixed top-12 right-12 z-[100] flex gap-4 text-[11px] font-black tracking-widest">
        <button onClick={() => setLang('en')} className={`${lang === 'en' ? 'text-blue-600' : 'text-white/20'}`}>EN</button>
        <span className="text-white/5">/</span>
        <button onClick={() => setLang('zh')} className={`${lang === 'zh' ? 'text-blue-600' : 'text-white/20'}`}>华语</button>
      </div>

      {/* 左侧文字导航 */}
      <aside className="fixed left-0 top-0 h-full w-24 border-r border-white/5 flex flex-col items-center py-24 z-50 bg-black">
        <div className="mb-20 font-black text-2xl tracking-tighter">W.</div>
        <nav className="flex flex-col gap-24 [writing-mode:vertical-lr] items-center">
          <Link href="/business" className="text-[10px] tracking-[0.5em] uppercase opacity-30 hover:opacity-100 transition-all font-bold hover:text-blue-500">{content[lang].nav_biz}</Link>
          <Link href="/library" className="text-[10px] tracking-[0.5em] uppercase opacity-30 hover:opacity-100 transition-all font-bold hover:text-blue-500">{content[lang].nav_lib}</Link>
        </nav>
      </aside>

      <main className="pl-24 flex flex-col items-center justify-center min-h-screen text-center px-10">
        <div className="max-w-4xl space-y-32">
          {/* 1. 网站名字 */}
          <h1 className="text-7xl md:text-[11rem] font-black tracking-[-0.05em] leading-none bg-gradient-to-b from-white to-white/10 bg-clip-text text-transparent">
            WEACOND
          </h1>

          <div className="space-y-28">
            {/* 2. 我们的逻辑 */}
            <section className="space-y-8">
              <h2 className="text-[10px] uppercase tracking-[0.8em] text-white/20 font-bold">The Logic / 我们的理念</h2>
              <p className="text-xl md:text-3xl font-light leading-relaxed max-w-2xl mx-auto text-white/90 italic italic-font">
                “{content[lang].logic}”
              </p>
            </section>

            {/* 3. 我们是做什么的 */}
            <section className="space-y-8">
              <h2 className="text-[10px] uppercase tracking-[0.8em] text-white/20 font-bold">Mission / 我们是做什么的</h2>
              <p className="text-lg md:text-xl text-white/50 leading-loose max-w-xl mx-auto font-light">
                {content[lang].mission}
              </p>
            </section>

            {/* 4. 联系方式 */}
            <section className="space-y-4">
              <p className="font-mono text-xs text-white/20 tracking-[0.3em]">CONTACT: WEACOND@GMAIL.COM</p>
            </section>

            {/* 5. 业务按钮 */}
            <section className="pt-10">
              <Link href="/business" className="inline-block px-20 py-5 border border-white/10 rounded-full text-[10px] tracking-[0.6em] font-bold uppercase hover:bg-white hover:text-black transition-all duration-700">
                {content[lang].btn} →
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

