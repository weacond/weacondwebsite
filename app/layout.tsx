import "./globals.css"
import Sidebar from "@/components/Sidebar"
import Navbar from "@/components/Navbar"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body className="bg-slate-900 text-gray-200">

        <Navbar />

        <div className="flex">

          <Sidebar />

          <main className="flex-1 p-10 max-w-4xl mx-auto">
            {children}
          </main>

        </div>

      </body>
    </html>
  )
}
