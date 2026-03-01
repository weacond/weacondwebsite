import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen bg-white text-black">
      {/* 左侧菜单 Sidebar */}
      <aside className="w-64 border-r border-gray-100 p-8 flex flex-col gap-6 fixed h-full">
        <div className="text-xs tracking-widest text-gray-400 uppercase">Menu</div>
        <Link href="/business" className="font-medium hover:italic transition-all">💼 我的业务 / Business</Link>
        <Link href="/library" className="font-medium hover:italic transition-all">📚 电子书库 / Library</Link>
      </aside>

      {/* 主内容区 Main Content */}
      <main className="flex-1 ml-64 flex flex-col items-center justify-center text-center px-4">
        <div className="max-w-2xl space-y-16">
          {/* 1. 网站名字 */}
          <h1 className="text-7xl font-black tracking-tighter">WEACOND</h1>
          
          {/* 2. 理念 */}
          <section>
            <p className="text-sm uppercase tracking-[0.4em] text-gray-400 mb-4">Our Logic</p>
            <p className="text-2xl font-serif italic">“通过代码自动化与金融建模，构建坚不可摧的财富护城河。”</p>
          </section>

          {/* 3. 做什么的 */}
          <section>
            <p className="text-sm uppercase tracking-[0.4em] text-gray-400 mb-4">What We Do</p>
            <p className="text-lg">提供顶级 AI 信号、卖 Put 策略筛选及金融决策闭环系统。</p>
          </section>

          {/* 4. 联系方式 */}
          <section>
            <p className="text-sm uppercase tracking-[0.4em] text-gray-400 mb-4">Contact</p>
            <p className="text-xl font-mono border-b border-black inline-block">weacond@gmail.com</p>
          </section>

          {/* 5. 按钮 */}
          <Link href="/business" className="inline-block bg-black text-white px-12 py-4 rounded-full text-sm font-bold hover:invert transition-all">
            ENTER BUSINESS →
          </Link>
        </div>
      </main>
    </div>
  );
}
