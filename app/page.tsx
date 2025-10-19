export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-800">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center py-24 px-6 bg-white shadow-sm">
        <h1 className="text-4xl font-bold mb-4">让投资变得轻松、方便、稳定。</h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          我们专注于构建理性投资的教育与智能化系统，让每个人都能理解财富增长的本质。
        </p>
      </section>

      {/* Mission Section */}
      <section className="py-20 px-8 max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold mb-3">我们的使命</h2>
        <p className="text-gray-700 leading-relaxed">
          Weacond 的使命是让投资变得更轻松。我们相信，稳定与理性才是真正的力量。
        </p>
      </section>

      {/* Philosophy Section */}
      <section className="py-20 px-8 bg-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold mb-3">我们的理念</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>投资应以数据和逻辑为基础，而非情绪。</li>
            <li>理财教育是每个人都需要的能力。</li>
            <li>自动化与智能化是未来的趋势。</li>
          </ul>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-8 max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold mb-3">关于 Weacond</h2>
        <p className="text-gray-700 leading-relaxed">
          Weacond 是一个年轻的金融理念项目，由对市场理性思维充满热情的团队创建。
          我们的目标是帮助个人投资者建立稳定、系统化的财富思维。
        </p>
      </section>

      {/* Contact Section */}
      <section className="py-20 px-8 bg-gray-100 text-center">
        <h2 className="text-2xl font-semibold mb-3">联系</h2>
        <p className="text-gray-700">邮箱：<strong>weacond@gmail.com</strong></p>
        <p className="text-gray-500 mt-2">更多内容 Coming Soon</p>
      </section>
    </main>
  );
}
