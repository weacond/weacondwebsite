import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-[#f5f5f7]">
      <aside className="fixed left-0 top-0 h-full w-20 border-r border-[#1d1d1f] flex flex-col items-center py-12 z-50 bg-black/80 backdrop-blur-xl">
        <div className="mb-16 font-bold text-xl tracking-tighter">W.</div>
        <nav className="flex flex-col gap-12">
          <Link href="/business" className="opacity-40 hover:opacity-100 transition-opacity text-2xl">💼</Link>
          <Link href="/library" className="opacity-40 hover:opacity-100 transition-opacity text-2xl">📚</Link>
        </nav>
      </aside>

      <main className="pl-20 flex flex-col items-center justify-center min-h-screen text-center px-6">
        <div className="max-w-4xl space-y-28">
          <h1 className="text-8xl md:text-[10rem] font-black tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-b from-white to-[#424245]">
            WEACOND
          </h1>

          <div className="space-y-20">
            <section>
              <p className="text-[10px] uppercase tracking-[0.5em] text-apple-gray mb-6 font-medium">Our Logic / 我们的逻辑</p>
              <p className="text-2xl md:text-3xl font-light leading-relaxed italic">
                “让投资变得轻松、方便、稳定。我们相信稳定性才是真正的力量。”
              </p>
            </section>

            <section>
              <p className="text-[10px] uppercase tracking-[0.5em] text-apple-gray mb-6 font-medium">What We Do / 我们是做什么的</p>
              <p className="text-xl text-[#a1a1a6] font-medium">
                顶级 AI 信号与卖 Put 策略筛选系统，构建智能化投资教育。
              </p>
            </section>

            <section className="font-mono text-sm text-[#424245] tracking-widest">
              CONTACT: weacond@gmail.com
            </section>

            <section>
              <Link href="/business" className="inline-block bg-apple-blue text-white px-12 py-5 rounded-full font-bold text-lg hover:scale-105 transition-all shadow-2xl shadow-apple-blue/20">
                ENTER BUSINESS →
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
