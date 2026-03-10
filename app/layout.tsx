import '../styles/globals.css'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { useState } from 'react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<'cn' | 'en'>('cn')

  const toggleLang = () => setLang(prev => (prev === 'cn' ? 'en' : 'cn'))

  return (
    <html lang={lang}>
      <body className="bg-slate-900 text-gray-200 flex">
        <Sidebar />
        <div className="flex-1 min-h-screen flex flex-col">
          <Navbar toggleLang={toggleLang} />
          <main className="flex-1 p-4">{children}</main>
        </div>
      </body>
    </html>
  )
}
