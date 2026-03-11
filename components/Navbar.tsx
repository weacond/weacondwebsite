"use client";

interface NavbarProps {
  toggleLang: () => void;
  lang: "cn" | "en";
}

export default function Navbar({ toggleLang, lang }: NavbarProps) {
  return (
    <nav className="p-4 bg-slate-800 flex justify-between items-center">
      <div className="text-xl font-bold">Weacond</div>
      <button
        onClick={toggleLang}
        className="px-3 py-1 bg-slate-600 rounded hover:bg-slate-500"
      >
        {lang === "cn" ? "中文" : "English"}
      </button>
    </nav>
  );
}
