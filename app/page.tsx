import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="bg-black text-[#f5f5f7] min-h-screen font-sans selection:bg-[#0071e3] selection:text-white">
      {/* 1. 极简侧边栏菜单 */}
      <aside className="fixed left-0 top-0 h-full w-20 border-r border-[#1d1d1f] flex flex-col items-center py-10 z-50 bg-black">
        <div className="mb-12 font-bold text-xl">W.</div>
        <nav className="flex flex-col gap-10">
          <Link href="/business" title="My Business" className="opacity-40 hover:opacity-100 transition-opacity">💼</Link>
          <Link href="/library" title="Library" className="opacity-40 hover:opacity-100 transition-opacity">📚</Link>
        </nav>
      </aside>

      <main className="pl-20">
        {/* 2. Apple 标志性的居中 Hero Section */}
        <section className="h-screen flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-[12vw] font-bold tracking-tighter leading-none mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-[#424245]">
            WEACOND
          </h1>
          
          <div className="max-w-2xl space-y-12 mt-10">
            {/* 3. 理念 - Apple 般的优雅字体间距 */}
            <p className="text-2xl font-semibold tracking-tight text-[#a1a1a6]">
              Defending against the unexpected through algorithmic precision.
            </p>

            {/* 4. 我们是做什么的 */}
            <p className="text-lg text-[#86868b] leading-relaxed">
              顶级 AI 信号与卖 Put 策略筛选系统。
            </p>

            {/* 5. 联系方式 & 按钮 */}
            <div className="flex flex-col items-center gap-8 pt-6">
              <span className="text-sm font-mono text-[#424245]">weacond@gmail.com</span>
              <Link href="/business" className="bg-[#0071e3] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#0077ed] transition-all hover:scale-105">
                ENTER BUSINESS →
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
