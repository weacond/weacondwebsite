import Link from "next/link";
import { useLanguage } from "../contexts/LanguageContext";

export default function Navbar() {
  const { lang, setLang } = useLanguage();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur z-40 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Left: logo (click -> home) */}
        <div>
          <Link href="/">
            <a className="text-2xl font-extrabold text-primary hover:opacity-90">Weacond</a>
          </Link>
        </div>

        {/* Center: nav links (desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/"><a className="hover:text-accent">{lang === "zh" ? "主页" : "Home"}</a></Link>
          <Link href="/ebooks"><a className="hover:text-accent">{lang === "zh" ? "电子书" : "Ebooks"}</a></Link>
        </nav>

        {/* Right: language select */}
        <div className="flex items-center gap-4">
          <label className="sr-only">Language</label>
          <select
            aria-label="Select UI language"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
            title={lang === "zh" ? "切换语言" : "Switch language"}
          >
            <option value="zh">华语</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
    </header>
  );
}
