"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "../contexts/LanguageContext";

const navItems = [
  { href: "/", key: "home" },
  { href: "/ebooks", key: "ebooks" },
];

const labels = {
  zh: {
    home: "主页",
    ebooks: "电子书",
    switchLang: "切换语言",
    openMenu: "打开菜单",
    closeMenu: "关闭菜单",
    language: "语言",
  },
  en: {
    home: "Home",
    ebooks: "Ebooks",
    switchLang: "Switch language",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    language: "Language",
  },
};

export default function Navbar() {
  const { lang, setLang } = useLanguage();
  const t = labels[lang] || labels.zh;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur z-40 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* 左侧：logo / 返回首页 */}
        <Link
          href="/"
          aria-label="Weacond home"
          className="text-2xl font-extrabold text-primary hover:opacity-90"
        >
          Weacond
        </Link>

        {/* 中：导航（桌面） */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-6 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href === "/" ? "page" : undefined}
              className="hover:text-accent transition-colors"
            >
              {t[item.key]}
            </Link>
          ))}
        </nav>

        {/* 右侧：语言选择 + 移动端菜单按钮 */}
        <div className="flex items-center gap-4">
          <label className="sr-only" htmlFor="lang-select">{t.language}</label>
          <select
            id="lang-select"
            aria-label={t.switchLang}
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
            title={t.switchLang}
          >
            <option value="zh">华语</option>
            <option value="en">English</option>
          </select>

          {/* 移动端汉堡按钮 */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2 rounded hover:bg-slate-100"
            aria-label={menuOpen ? t.closeMenu : t.openMenu}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {menuOpen && (
        <nav id="mobile-menu" aria-label="Mobile" className="md:hidden border-t border-slate-100 bg-white">
          <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col gap-3 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="py-1 hover:text-accent transition-colors"
              >
                {t[item.key]}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
