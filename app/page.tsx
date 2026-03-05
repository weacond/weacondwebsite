import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="bg-[#050505] text-white min-h-screen font-sans selection:bg-blue-600">
      {/* 顶部免责声明 - 纯文字防护 */}
      <div className="fixed top-0 w-full bg-white/5 backdrop-blur-md py-3 text-[10px] text-center text-white/30 z-[100] tracking-[0.3em] uppercase">
        Disclaimer: For educational purposes only. Not financial advice.
      </div>

      {/* 左侧文字导航 - 无图标极简设计 */}
      <aside className="fixed left-0 top-0 h-full w-24 border-r border-white/5 flex flex-col items-center py-24 z-50 bg-black">
        <div className="mb-20 font-black text-2xl tracking-tighter">W.</div>
        <nav className="flex flex-col gap-20 [writing-mode:vertical-lr] items-center">
          <Link href="/business" className="text-[10px] tracking-[0.5em] uppercase opacity-30 hover:opacity-100 transition-all font-bold hover:text-blue-500">Business</Link>
          <Link href="/library" className="text-[10px] tracking-[0.5em] uppercase opacity-30 hover:opacity-100 transition-all font-bold hover:text-blue-500">Library</Link>
        </nav>
      </aside>

      <main className="pl-24 flex flex-col items-center justify-center min-h-screen text-center px-10">
        <div className="max-w-4xl space-y-36">
          {/* 1. 网站名字 */}
          <h1 className="text-8xl md:text-[11rem] font-black tracking-[-0.05em] leading-none bg-gradient-to-b from-white to-white/10 bg-clip-text text-transparent">
            WEACOND
          </h1>

          <div className="space-y-28">
            {/* 2. 我们的逻辑（理念） */}
            <section className="space-y-8 text-center">
              <h2 className="text-[10px] uppercase tracking-[0.8em] text-white/20 font-bold">The Logic / 我们的理念</h2>
              <p className="text-xl md:text-3xl font-light leading-relaxed max-w-2xl mx-auto text-white/90 italic">
                “让投资变得轻松、方便、稳定。我们相信，稳定与理性才是真正的力量。”
              </p>
            </section>

            {/* 3. 我们是做什么的 */}
            <section className="space-y-8">
              <h2 className="text-[10px] uppercase tracking-[0.8em] text-white/20 font-bold">Mission / 我们是做什么的</h2>
              <p className="text-lg md:text-xl text-white/50 leading-loose max-w-xl mx-auto font-light">
                构建理性投资的教育与智能化系统，让每个人都能理解财富增长的本质。
              </p>
            </section>

            {/* 4. 联系方式 & 语言切换 */}
            <section className="space-y-6">
              <p className="font-mono text-xs text-white/20 tracking-[0.3em]">CONTACT: WEACOND@GMAIL.COM</p>
              <div className="flex justify-center gap-8 text-[11px] font-black tracking-[0.4em]">
                <button className="text-blue-600">EN</button>
                <span className="text-white/5">/</span>
                <button className="text-white/30 hover:text-white transition-colors">中文</button>
              </div>
            </section>

            {/* 5. 行动按钮 */}
            <section className="pt-10">
              <Link href="/business" className="inline-block px-20 py-5 border border-white/10 rounded-full text-[10px] tracking-[0.6em] font-bold uppercase hover:bg-white hover:text-black transition-all duration-700">
                Enter Business →
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
