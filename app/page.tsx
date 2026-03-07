import Link from "next/link"

export default function Home() {

return (

<div className="text-center space-y-16">

<div>

<h1 className="text-5xl font-bold mb-6">
让投资变得轻松、方便、稳定
</h1>

<p className="text-gray-400">
我们专注于构建理性投资教育与智能化系统
</p>

</div>

<div>

<h2 className="text-3xl mb-4">我们的理念</h2>

<ul className="text-gray-400 space-y-2">
<li>投资应基于数据与逻辑</li>
<li>理财教育是每个人需要的能力</li>
<li>自动化是未来趋势</li>
</ul>

</div>

<div>

<h2 className="text-3xl mb-4">我们是做什么的</h2>

<p className="text-gray-400">
提供投资教育、电子书、与系统化投资思维。
</p>

</div>

<div>

<h2 className="text-3xl mb-4">联系方式</h2>

<p className="text-gray-400">
weacond@gmail.com
</p>

</div>

<div>

<Link
href="/business"
className="bg-sky-500 px-6 py-3 rounded-lg"
>

我的业务

</Link>

</div>

</div>

)

}
