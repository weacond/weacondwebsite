import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="flex flex-col md:flex-row min-h-screen bg-white text-black">
        {/* 左边菜单 */}
        <nav className="w-full md:w-64 bg-gray-50 p-6 border-b md:border-r border-gray-200">
          <h2 className="text-xl font-bold mb-8">Weacond</h2>
          <div className="flex flex-col gap-4">
            <Link href="/" className="hover:text-blue-600 font-medium">🚀 我的业务</Link>
            <Link href="/library" className="hover:text-blue-600 font-medium">📚 电子书库</Link>
          </div>
        </nav>
        {/* 右侧主内容 */}
        <main className="flex-1 p-8 md:p-16">{children}</main>
      </body>
    </html>
  );
}

