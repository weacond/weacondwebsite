import "./globals.css";
import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900">
        <div className="flex min-h-screen">
          
          {/* Sidebar */}
          <aside className="w-56 border-r border-neutral-200 p-8">
            <h1 className="text-lg font-medium mb-12">
              Financial System
            </h1>

            <nav className="space-y-6 text-sm">
              <Link href="/" className="block hover:text-neutral-500 transition">
                我的业务
              </Link>

              <Link href="/library" className="block hover:text-neutral-500 transition">
                电子书库
              </Link>
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 px-24 py-20">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}
