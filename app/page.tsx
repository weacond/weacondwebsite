import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="bg-black text-[#f5f5f7] min-h-screen">
      {/* 左侧悬浮菜单 */}
      <aside className="fixed left-0 top-0 h-full w-20 border-r border-[#1d1d1f] flex flex-col items-center py-10 z-50 bg-black">
        <div className="mb-12 font-bold text-xl tracking-tighter text-white">W.</div>
        <nav className="flex flex-col gap-10">
          <Link href="/business" title="我的业务" className="opacity-40 hover:opacity-100 transition-opacity">💼</Link>
          <Link href="/library" title="电子书库" className="opacity-40 hover:opacity-100 transition-opacity">📚</Link>
        </nav>
      </aside>

      {/* 居中内容区 */}
      <main className="pl-20 flex flex-col items-center justify-center min-h-screen text-center px-4">
        <div className="max-w-3xl space-y-20">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white leading-none">
            WEACOND
          </h1>

          <div className="space-y-12">
            <section>
              <p className="text-[10px] uppercase tracking-[0.4em] text-[#86868b] mb-4">Our Logic / 我们的理念</p>
              <p className="text-xl md:text-2xl font-light leading-relaxed">
                “让投资变得轻松、方便、稳定。我们相信稳定性才是真正的力量。”
              </p>
            </section>

            <section>
              <p className="text-[10px] uppercase tracking-[0.4em] text-[#86868b] mb-4">What We Do / 我们是做什么的</p>
              <p className="text-lg text-[#a1a1a6]">
                顶级 AI 信号与卖 Put 策略筛选系统，构建智能化投资教育。
              </p>
            </section>

            <section className="text-sm font-mono text-[#424245]">
              weacond@gmail.com
            </section>

            <Link href="/business" className="inline-block bg-[#0071e3] text-white px-10 py-3 rounded-full font-bold hover:bg-[#0077ed] transition-all">
              ENTER BUSINESS →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
