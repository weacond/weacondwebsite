import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import useSWR from "swr";
import { useEffect, useState } from "react";

const fetcher = (url) => fetch(url).then((r) => r.json());

export default function Ebooks() {
  const { lang } = useLanguage();

  const [bookLang, setBookLang] = useState(lang === "zh" ? "cn" : "en");

  const { data, error, isLoading } = useSWR("/api/ebooks", fetcher, {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    const defaultForUi = lang === "zh" ? "cn" : "en";
    setBookLang(defaultForUi);
  }, [lang]);

  const labels = {
    zh: {
      pageTitle: "电子书",
      selectLabel: "书籍语言",
      read: "阅读",
      noBooks: "暂无书籍",
    },
    en: {
      pageTitle: "Ebooks",
      selectLabel: "Book language",
      read: "Read",
      noBooks: "No books available",
    },
  }[lang];

  return (
    <div className="min-h-screen pb-24">
      <Navbar />
      <main className="pt-24">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">{labels.pageTitle}</h1>

            <div className="flex items-center gap-3">
              <label className="text-sm">{labels.selectLabel}:</label>
              <select
                value={bookLang}
                onChange={(e) => setBookLang(e.target.value)}
                className="border px-3 py-1 rounded"
              >
                <option value="cn">中文 (cn)</option>
                <option value="bilingual">双语 (bilingual)</option>
                <option value="en">English (en)</option>
              </select>
            </div>
          </div>

          {isLoading && <p className="text-gray-500">Loading...</p>}
          {error && (
            <p className="text-red-500">
              Failed to load books. {error?.message}
            </p>
          )}

          {data && data.length === 0 && (
            <p className="text-gray-500">{labels.noBooks}</p>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {data &&
              data.map((book) => {
                const payload = book[bookLang] || {};
                const title =
                  payload.title ||
                  (lang === "zh"
                    ? "未提供该语言的书名"
                    : "Title not provided");
                const description = payload.description || "";

                // ✅ 核心：改成内部页面
                const link = `/ebooks/${book.number}-${bookLang}`;

                return (
                  <article
                    key={book.number}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-semibold">{title}</h2>
                        <p className="text-sm text-gray-600 mt-2">
                          {description}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-400">
                          #{book.number}
                        </p>

                        {/* ✅ 关键：不再跳转外部 */}
                        <a
                          href={link}
                          className="mt-4 inline-block bg-primary text-white px-4 py-2 rounded"
                        >
                          {labels.read}
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
        </div>
      </main>
    </div>
  );
}
