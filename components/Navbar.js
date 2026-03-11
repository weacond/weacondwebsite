import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Link from 'next/link';

export default function Navbar() {
  const { lang, setLang } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center fixed w-full z-50">
      {/* 左上角 Logo/文字 */}
      <Link href="/">
        <a className="text-2xl font-bold text-primary hover:text-secondary">Weacond</a>
      </Link>

      {/* 菜单 */}
      <div className="hidden md:flex space-x-6 items-center">
        <Link href="/"><a className="hover:text-secondary">{lang === 'zh' ? '主页' : 'Home'}</a></Link>
        <Link href="/ebooks"><a className="hover:text-secondary">{lang === 'zh' ? '电子书' : 'Ebooks'}</a></Link>

        {/* 语言切换 */}
        <select
          value={lang}
          onChange={e => setLang(e.target.value)}
          className="border rounded px-2 py-1 font-semibold text-primary"
        >
          <option value="zh">华语</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* 手机端汉堡菜单 */}
      <button className="md:hidden text-2xl" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      {menuOpen && (
        <div className="absolute top-16 left-0 w-full bg-white shadow-md flex flex-col p-4 md:hidden">
          <Link href="/"><a className="py-2">{lang === 'zh' ? '主页' : 'Home'}</a></Link>
          <Link href="/ebooks"><a className="py-2">{lang === 'zh' ? '电子书' : 'Ebooks'}</a></Link>
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            className="border rounded px-2 py-1 mt-2"
          >
            <option value="zh">华语</option>
            <option value="en">English</option>
          </select>
        </div>
      )}
    </nav>
  )
        }
