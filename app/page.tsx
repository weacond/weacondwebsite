'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 space-y-12">
      {/* 网站名字 */}
      <h1 className="text-5xl font-extrabold text-black">Weacond</h1>

      {/* 网站逻辑/理念 */}
      <p className="text-lg text-center max-w-2xl">
        让投资变得轻松、方便、稳定。我们专注于构建理性投资的教育与智能化系统，让每个人都能理解财富增长的本质。
      </p>

      {/* 我们是做什么的 */}
      <p className="text-center max-w-xl">
        <strong>使命：</strong>让投资更轻松，稳定与理性才是真正的力量。<br/>
        <strong>理念：</strong>投资应以数据和逻辑为基础，而非情绪。
      </p>

      {/* 联系方式 */}
      <p className="text-center">
        联系我们: <a href="mailto:contact@weacond.com" className="text-blue-500 hover:underline">contact@weacond.com</a>
      </p>

      {/* 按钮 */}
      <div className="flex gap-6">
        <Link
          href="/business"
          className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-yellow-500 transition"
        >
          我们的业务
        </Link>

        <Link
          href="/books"
          className="px-6 py-3 border-2 border-black text-black font-semibold rounded-lg hover:bg-black hover:text-yellow-500 transition"
        >
          电子书库
        </Link>
      </div>
    </div>
  )
}
