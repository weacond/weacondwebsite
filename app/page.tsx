export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-6 mt-20">
      <h1 className="text-5xl font-bold">Weacond</h1>
      <p className="text-xl">我们的逻辑（理念）</p>
      <p className="text-lg">我们是做什么的</p>
      <p className="text-lg">联系方式</p>
      <a href="/library" className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-600">
        我的业务
      </a>
    </div>
  )
}
