import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import { fetchEbookIndex, normalizeBook } from "../lib/r2";
import { buyBook } from "../lib/checkoutClient";

export const metadata = {
  title: "投资书房 · 电子书 — Weacond",
  description: "Weacond 投资书房：精选经典投资著作，构建你的理性思维系统。中英双语电子书。",
  keywords: ["电子书", "投资", "书房", "Weacond", "ebooks"],
  robots: { index: true, follow: true },
};

export async function getStaticProps() {
  let books = [];
  // 1. 优先 R2 公开桶（线上数据源）
  try {
    books = await fetchEbookIndex();
  } catch (error) {
    console.error("R2 index fetch failed:", error.message);
  }
  // 2. R2 不可用 → 回退本地打包目录（构建期 Node 上下文，fs 安全，不进 Edge 包）
  if (!Array.isArray(books) || books.length === 0) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const p = path.join(process.cwd(), "public", "ebooks", "index.json");
      const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
      books = Array.isArray(raw) ? raw.map(normalizeBook) : [];
      console.warn(`ebooks: 使用本地 index.json 兜底（${books.length} 本）`);
    } catch (e) {
      console.error("ebooks 本地兜底失败:", e.message);
    }
  }
  return { props: { books }, revalidate: 300 };
}

export default function EbooksList({ books = [] }) {
  const { lang } = useLanguage();
  const safeBooks = Array.isArray(books) ? books : [];

  // 已购集合：先读本地缓存，再向 /api/purchases 核对服务端真实记录（绕开 RLS 的隐私风险）
  const [owned, setOwned] = useState(new Set());
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("weacond_purchases") || "[]");
      if (Array.isArray(cached) && cached.length) setOwned(new Set(cached));
    } catch {}
    fetch("/api/purchases", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { slugs: [] }))
      .then((d) => {
        const slugs = Array.isArray(d.slugs) ? d.slugs : [];
        if (slugs.length) {
          localStorage.setItem("weacond_purchases", JSON.stringify(slugs));
          setOwned(new Set(slugs));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="bg-white border-b border-slate-200 pt-20 pb-17">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4 pt-2">
            {lang === "zh" ? "投资书房" : "Investment Library"}
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {lang === "zh" ? "精选经典著作，构建你的理性思维系统。" : "Curated classics to build your rational thinking system."}
          </p>
        </div>
      </div>
      <main className="max-w-5xl mx-auto px-4 py-12">
        {safeBooks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">
              {lang === "zh" ? "暂无书籍" : "No books available."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {safeBooks.map((book) => (
              <Link
                key={book.id}
                href={`/ebooks/${book.slug}`}
                className="group block bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 overflow-hidden"
              >
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-indigo-600 tracking-wider">#{book.number}</span>
                  <span className="text-xs text-slate-400 group-hover:text-indigo-500 transition-colors">
                    {lang === "zh" ? "阅读" : "Read"} →
                  </span>
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-3 text-slate-800 group-hover:text-indigo-700 transition-colors line-clamp-2">
                    {lang === "en" ? (book.title_en || book.title) : (book.title_cn || book.title)}
                  </h2>
                  <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                    {lang === "en" ? (book.desc_en || book.desc) : (book.desc_cn || book.desc)}
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    {book.price > 0 ? (
                      <span className="text-lg font-bold text-indigo-600">${book.price}</span>
                    ) : (
                      <span className="text-sm font-medium text-green-600">
                        {lang === "zh" ? "免费" : "Free"}
                      </span>
                    )}
                    {owned.has(book.slug) || owned.has("bundle-all") ? (
                      <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-medium">
                        {lang === "zh" ? "已购 ✓" : "Owned ✓"}
                      </span>
                    ) : book.price > 0 ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          buyBook(book.slug, {
                            titleCn: book.title_cn,
                            titleEn: book.title_en,
                          });
                        }}
                        className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-500 transition-colors">
                        {lang === "zh" ? "购买" : "Buy"}
                      </button>
                    ) : (
                      <a
                        href={`/api/download?slug=${book.slug}&format=pdf`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-500 transition-colors">
                        {lang === "zh" ? "下载 PDF" : "Download PDF"}
                      </a>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}