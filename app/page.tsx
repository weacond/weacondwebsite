import Link from 'next/link';

export default function Home() {
  return (
    <div className="bg-black text-white min-h-screen font-sans selection:bg-yellow-500 selection:text-black">
      {/* 顶部极简导航 */}
      <nav className="p-8 flex justify-between items-center border-b border-gray-900 sticky top-0 bg-black/80 backdrop-blur-md z-50">
        <div className="text-2xl font-black tracking-tighter">WEACOND.</div>
        <div className="space-x-8 text-xs uppercase tracking-widest text-gray-400">
          <Link href="/business" className="hover:text-white transition">Business</Link>
          <Link href="/library" className="hover:text-white transition">Library</Link>
        </div>
      </nav>

      {/* 英雄区：巨大的视觉冲击 */}
      <main className="flex flex-col items-center justify-center pt-32 px-10">
        <h1 className="text-[12vw] font-black leading-none mb-10 tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-800">
          WEACOND
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 max-w-5xl w-full py-20 border-t border-gray-900">
          <div>
            <p className="text-gray-500 uppercase text-[10px] tracking-[0.5em] mb-4">The Logic</p>
            <p className="text-2xl font-light italic leading-relaxed text-gray-300">
              “Defending against the unexpected through algorithmic precision.”
            </p>
          </div>
          <div className="flex flex-col justify-end items-start gap-6">
            <p className="text-gray-400 text-lg leading-relaxed">
              提供顶级 AI 信号与卖 Put 策略筛选系统。
            </p>
            <Link href="/business" className="group flex items-center gap-4 text-sm font-bold border-b border-white pb-2 hover:gap-8 transition-all">
              ENTER BUSINESS <span className="group-hover:translate-x-2 transition-transform">→</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
