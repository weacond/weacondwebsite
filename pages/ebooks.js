import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import Link from "next/link";
import { useState } from "react";
import { Client } from "@notionhq/client";

// ✅ 构建时从 Notion 拉取数据
export async function getStaticProps() {
  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const database_id = process.env.NOTION_EBOOK_DATABASE_ID;

  if (!database_id) {
    return { props: { ebooks: [] } };
  }

  try {
    const response = await notion.databases.query({
      database_id,
      sorts: [{ property: "序号", direction: "ascending" }],
    });

    const ebooks = response.results.map((page) => ({
      id: page.id,
      number: page.properties["序号"]?.number || 0,
      cnTitle: page.properties["书名"]?.title?.[0]?.plain_text || "",
      enTitle: page.properties["English Title"]?.title?.[0]?.plain_text || "",
    }));

    return {
      props: { ebooks },
      revalidate: 60, // 每 60 秒自动更新
    };
  } catch (error) {
    console.error("Notion fetch error:", error);
    return { props: { ebooks: [] } };
  }
}

export default function Ebooks({ ebooks }) {
  const { lang } = useLanguage();
  const [bookLang, setBookLang] = useState(lang === "zh" ? "cn" : "en");

  const labels = {
    zh: { pageTitle: "电子书", selectLabel: "书籍语言", read: "阅读", noBooks: "暂无书籍" },
    en: { pageTitle: "Ebooks", selectLabel: "Book language", read: "Read", noBooks: "No books available" },
  }[lang];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">{labels.pageTitle}</h1>

        <div className="mb-6">
          <label className="block mb-2 font-medium">{labels.selectLabel}:</label>
          <select
            value={bookLang}
            onChange={(e) => setBookLang(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-auto"
          >
            <option value="cn">中文 (cn)</option>
            <option value="bilingual">双语 (bilingual)</option>
            <option value="en">English (en)</option>
          </select>
        </div>

        {ebooks.length === 0 && <p className="text-gray-500">{labels.noBooks}</p>}

        <div className="grid gap-4">
          {ebooks.map((book) => {
            const title = bookLang === "en" ? book.enTitle : book.cnTitle;
            const link = `/ebooks/${book.id}-${bookLang}`;

            return (
              <div key={book.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
                <h2 className="text-xl font-semibold mb-2">{title || "Untitled"}</h2>
                <Link href={link} className="text-blue-600 hover:underline font-medium">
                  {labels.read} →
                </Link>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
