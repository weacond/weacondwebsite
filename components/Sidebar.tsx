import Link from 'next/link'

export default function Sidebar() {
  return (
    <aside className="w-48 bg-slate-800 min-h-screen p-4 flex flex-col gap-2">
      <Link href="/library">
        <a className="hover:bg-slate-700 px-2 py-1 rounded">电子书库</a>
      </Link>
      <Link href="/library">
        <a className="hover:bg-slate-700 px-2 py-1 rounded">我的业务</a>
      </Link>
    </aside>
  )
}
