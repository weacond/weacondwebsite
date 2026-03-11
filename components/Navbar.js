import { useState } from 'react';

export default function Navbar({ onLangChange, currentLang }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center fixed w-full z-50">
      <div className="text-2xl font-bold text-primary">Weacond</div>
      <div className="hidden md:flex space-x-6 items-center">
        <a href="/" className="hover:text-secondary transition">主页</a>
        <a href="/ebooks" className="hover:text-secondary transition">电子书</a>
        <select value={currentLang} onChange={e => onLangChange(e.target.value)} className="border rounded px-2 py-1">
          <option value="zh">华语</option>
          <option value="en">English</option>
        </select>
      </div>
      <button className="md:hidden text-2xl" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      {menuOpen && (
        <div className="absolute top-16 left-0 w-full bg-white shadow-md flex flex-col p-4 md:hidden">
          <a href="/" className="py-2">主页</a>
          <a href="/ebooks" className="py-2">电子书</a>
          <select value={currentLang} onChange={e => onLangChange(e.target.value)} className="border rounded px-2 py-1 mt-2">
            <option value="zh">华语</option>
            <option value="en">English</option>
          </select>
        </div>
      )}
    </nav>
  )
        }
