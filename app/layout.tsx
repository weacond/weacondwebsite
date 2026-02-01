import Link from 'next/link';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body>
        <div className="flex h-screen">
          <aside className="w-48 bg-gray-800 text-white p-4">
            <h2 className="text-xl font-bold mb-6">菜单</h2>
            <ul>
              <li className="mb-2">
                <Link href="/">
                  <a className="hover:text-blue-400">首页</a>
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/books">
                  <a className="hover:text-blue-400">电子书</a>
                </Link>
              </li>
            </ul>
          </aside>
          <main className="flex-1 bg-gray-100 p-6 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
