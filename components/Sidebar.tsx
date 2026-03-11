"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-52 bg-slate-900 p-4 h-screen">
      <ul className="space-y-2">
        <li>
          <Link href="/library" className="hover:text-white">
            我的业务
          </Link>
        </li>
        <li>
          <Link href="/library" className="hover:text-white">
            电子书库
          </Link>
        </li>
      </ul>
    </aside>
  );
}
