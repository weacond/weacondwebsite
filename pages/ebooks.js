import { Client } from "@notionhq/client";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";

// 1. 获取所有书籍（不分语言），构建时只跑一次
export async function getStaticProps() {
  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const database_id = process.env.NOTION_EBOOK_DATABASE_ID;

  if (!database_id) return { props: { books: [] } };

  try {
    const response = await notion.databases.query({
      database_id,
      sorts: [{ property: "Number", direction: "ascending" }],
    });

    const books = response.results.map((page) => {
      const props = page.properties;
      const getText = (prop) => {
        if (!prop) return "";
        if (prop.title) return prop.title.map((t) => t.plain_text).join("");
        if (prop.rich_text) return prop.rich_text.map((t) => t.plain_text).join("");
        return "";
      };

      return {
        id: page.id,
        number: getText(props["Number"]), // 获取 "1A" 或 "1B"
        title: getText(props["Title"]),
        desc: getText(props["Description"]),
      };
    });

    return { props: { books }, revalidate: 60 };
  } catch (error) {
    console.error(error);
    return { props: { books: [] } };
  }
}

export default function EbooksList({ books }) {
  const { lang } = useLanguage(); // ✅ 在这里使用 Hook

  // ✅ 在客户端根据语言过滤：英文看 A，中文看 B
  const filteredBooks = books.filter((book) => {
    if (lang === "zh") return book.number.endsWith("B");
    return book.number.endsWith("A");
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">
          {lang === "zh" ? "电子书库" : "eBook Library"}
        </h1>
        
        {filteredBooks.length === 0 && (
          <p className="text-gray-500 text-center py-10">
            {lang === "zh" ? "暂无该语言版本的书籍" : "No books available in this language."}
          </p>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {filteredBooks.map((book) => (
            <Link
              key={book.id}
              href={`/ebooks/${book.id}`}
              className="block p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition"
            >
              <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded mb-2 inline-block">
                {book.number}
              </span>
              <h2 className="text-xl font-bold mb-2">{book.title}</h2>
              <p className="text-gray-600 text-sm line-clamp-3">{book.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
