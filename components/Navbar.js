"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "../contexts/LanguageContext";

const navItems = [
  { href: "/", key: "home" },
  { href: "/signals", key: "signals" },
  { href: "/ebooks", key: "ebooks" },
  { href: "/backtest", key: "backtest" },
  { href: "/ai", key: "ai" },
  { href: "/strategies", key: "strategies" },
  { href: "/pricing", key: "pricing" },
  { href: "/about", key: "about" },
];

const labels = {
  zh: {
    home: "主页",
    signals: "信号",
    ebooks: "书房",
    backtest: "回测",
    ai: "AI助手",
    strategies: "策略市场",
    pricing: "定价",
    about: "关于",
    login: "登录",
    dashboard: "仪表盘",
    switchLang: "切换语言",
    openMenu: "打开菜单",
    closeMenu: "关闭菜单",
    language: "语言",
  },
  en: {
    home: "Home",
    signals: "Signals",
    ebooks: "Ebooks",
    backtest: "Backtest",
    ai: "AI",
    strategies: "Strategies",
    pricing: "Pricing",
    about: "About",
    login: "Sign In",
    dashboard: "Dashboard",
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-md shadow-md" : "bg-white/80 backdrop-blur"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" aria-label="Weacond home"
          className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent hover:opacity-90 transition-opacity">
          Weacond
        </Link>
        <nav aria-label="Primary" className="hidden md:flex items-center gap-6 text-sm">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className="hover:text-indigo-600 transition-colors font-medium text-slate-700">
              {t[item.key]}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login"
            className="hidden md:inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
            {t.login}
          </Link>
          <label className="sr-only" htmlFor="lang-select">{t.language}</label>
          <select id="lang-select" aria-label={t.switchLang} value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="zh">华语</option>
            <option value="en">English</option>
          </select>
          <button type="button"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg hover:bg-slate-100"
            aria-label={menuOpen ? t.closeMenu : t.openMenu}
            aria-expanded={menuOpen} aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}>
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

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Mobile" className="md:hidden border-t border-slate-100 bg-white">
          <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col gap-2 text-sm">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}
                onClick={() => setMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors font-medium">
                {t[item.key]}
              </Link>
            ))}
            <div className="border-t border-slate-100 mt-1 pt-2">
              <Link href="/login" onClick={() => setMenuOpen(false)}
                className="block py-2 px-3 rounded-lg hover:bg-indigo-50 text-indigo-600 font-medium">
                {t.login}
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
