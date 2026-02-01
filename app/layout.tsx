'use client'

import { ReactNode } from 'react'
import Link from 'next/link'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh">
      <body className="font-sans">
        <header className="bg-gray-900 text-white p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Weacond</h1>
          <nav className="space-x-4">
            <Link href="/" className="hover:underline">主页</Link>
            <Link href="/books" className="hover:underline">电子书</Link>
            {/* 后续业务页可加更多按钮 */}
          </nav>
        </header>
        <main>{children}</main>
        <footer className="bg-gray-100 p-4 text-center text-sm text-gray-600">
          © 2026 Weacond. 联系邮箱: weacond@gmail.com
        </footer>
      </body>
    </html>
  )
}
