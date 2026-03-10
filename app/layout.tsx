import '../styles/globals.css'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-gray-200 flex">
        <Sidebar />

        <div className="flex-1 min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1 p-4">
            {children}
          </main>
        </div>

      </body>
    </html>
  )
}
