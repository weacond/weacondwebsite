import Link from "next/link"

export default function Sidebar(){

return(

<div className="w-48 border-r border-slate-700 p-6">

<div className="mb-6 text-lg font-bold">
Weacond
</div>

<nav className="flex flex-col gap-4">

<Link href="/business">
我的业务
</Link>

<Link href="/library">
电子书库
</Link>

</nav>

</div>

)
}
