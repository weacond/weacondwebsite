'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* 公司介绍 */}
      <section>
        <h1 className="text-3xl font-bold mb-2">Weacond</h1>
        <p className="mb-2">让投资变得轻松、方便、稳定。我们专注于构建理性投资的教育与智能化系统，让每个人都能理解财富增长的本质。</p>
        <p className="mb-2"><strong>使命：</strong>让投资变得更轻松，稳定与理性才是真正的力量。</p>
        <p className="mb-2"><strong>理念：</strong>投资应以数据和逻辑为基础，而非情绪。理财教育是每个人都需要的能力。自动化与智能化是未来的趋势。</p>
      </section>

      {/* 业务板块 */}
      <section>
        <h2 className="text-2xl font-bold mb-4">我们的业务</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {/* 业务示例：电子书 */}
          <div className="border p-4 rounded shadow hover:shadow-lg flex flex-col">
            <h3 className="font-semibold mb-2">电子书库</h3>
            <p className="flex-1">系统化整理投资知识，从财富底层逻辑到工具策略，三语模式，方便阅读学习。</p>
            <Link href="/books" className="mt-3 text-blue-500 hover:underline">
              了解更多
            </Link>
          </div>

          {/* 可添加更多业务 */}
          <div className="border p-4 rounded shadow hover:shadow-lg flex flex-col">
            <h3 className="font-semibold mb-2">业务2</h3>
            <p className="flex-1">这里写业务2的简介。</p>
            <Link href="/business2" className="mt-3 text-blue-500 hover:underline">
              了解更多
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
