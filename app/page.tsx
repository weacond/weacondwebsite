import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="bg-black text-[#f5f5f7] min-h-screen font-sans selection:bg-[#0071e3]">
      <aside className="fixed left-0 top-0 h-full w-20 border-r border-[#1d1d1f] flex flex-col items-center py-12 z-50 bg-black">
        <div className="mb-16 font-bold text-xl tracking-tighter">W.</div>
        <nav className="flex flex-col gap-12">
          <Link href="/business" title="My Business" className="opacity-40 hover:opacity-100 transition-opacity text-2xl">💼</Link>
          <Link href="/library" title="Library" className="opacity-40 hover:opacity-100 transition-opacity text-2xl">📚</Link>
        </nav>
      </aside>

      <main className="pl-20 flex flex-col items-center justify-center min-h-screen text-center px-4">
        <div className="max-w-3xl space-y-24">
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white leading-none">
            WEACOND
          </h1>

          <div className="space-y-16">
            <section>
              <p className="text-[10px] uppercase tracking-[0.5em] text-[#86868b] mb-4">Our Logic / 我们的理念</p>
              <p className="text-xl md:text-2xl font-light leading-relaxed">
                “让投资变得轻松、方便、稳定。我们相信稳定性才是真正的力量。”
              </p>
            </section>

            <section>
              <p className="text-[10px] uppercase tracking-[0.5em] text-[#86868b] mb-4">What We Do / 我们是做什么的</p>
              <p className="text-lg text-[#a1a1a6]">
                顶级 AI 信号与卖 Put 策略筛选系统，构建智能化投资教育。
              </p>
            </section>

            <section>
              <p className="text-sm font-mono text-[#424245]">weacond@gmail.com</p>
            </section>

            <section>
              <Link href="/business" className="inline-block bg-[#0071e3] text-white px-12 py-4 rounded-full font-bold hover:bg-[#0077ed] transition-all hover:scale-105">
                ENTER BUSINESS →
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
