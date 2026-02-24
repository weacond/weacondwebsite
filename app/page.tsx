import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto text-center py-12 space-y-12">
      {/* 1. 网站名字 */}
      <h1 className="text-5xl font-black tracking-tight">WEACOND</h1>

      {/* 2. 理念 */}
      <section>
        <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-2">我们的逻辑</h2>
        <p className="text-xl italic text-gray-800">“通过代码自动化与期权量化，实现跨越式的财富快车道。”</p>
      </section>

      {/* 3. 做什么的 */}
      <section>
        <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-2">核心业务</h2>
        <p className="text-lg text-gray-600">提供顶级 AI 信号、卖 Put 策略筛选及金融决策闭环系统。</p>
      </section>

      {/* 4. 联系方式 */}
      <section>
        <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-2">联系我们</h2>
        <p className="text-lg font-mono">weacond@gmail.com</p>
      </section>

      {/* 5. 按钮 */}
      <div>
        <Link href="/business-details" className="inline-block bg-black text-white px-8 py-3 rounded-full hover:bg-gray-800 transition">
          进入我的业务详情 →
        </Link>
      </div>
    </div>
  );
}
