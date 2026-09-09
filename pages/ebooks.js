import { Client } from "@notionhq/client";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";

export async function getStaticProps() {
  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_EBOOK_DATABASE_ID;

  if (!apiKey || !databaseId) {
    return { props: { books: [] } };
  }

  try {
    const notion = new Client({ auth: apiKey });
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [{ property: "Number", direction: "ascending" }],
    });

    const books = response.results.map((page) => {
      const props = page.properties || {};

      const getText = (prop) => {
        if (!prop) return "";
        if (prop.title) return prop.title.map((t) => t.plain_text).join("");
        if (prop.rich_text) return prop.rich_text.map((t) => t.plain_text).join("");
        return "";
      };

      return {
        id: page.id,
        number: getText(props["Number"]) || "",
        title: getText(props["Title"]) || getText(props["Name"]) || "Untitled",
        desc: getText(props["Description"]) || "",
      };
    });

    return { props: { books }, revalidate: 60 };
  } catch (error) {
    return { props: { books: [] } };
  }
}

export default function EbooksList({ books = [] }) {
  const { lang } = useLanguage();
  const currentLang = lang || "zh";

  const safeBooks = Array.isArray(books) ? books : [];

  const filteredBooks = safeBooks.filter((book) => {
    const num = (book.number || "").trim().toLowerCase();
    if (currentLang === "zh") {
      return num.endsWith("-cn") || num.endsWith("cn") || num.endsWith("b");
    }
    return num.endsWith("-en") || num.endsWith("en") || num.endsWith("a");
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-slate-900">
          {currentLang === "zh" ? "电子书库" : "eBook Library"}
        </h1>

        {filteredBooks.length === 0 && (
          <p className="text-slate-500 text-center py-10">
            {currentLang === "zh"
              ? "暂无该语言版本的书籍"
              : "No books available in this language."}
          </p>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {filteredBooks.map((book) => (
            <Link
              key={book.id}
              href={`/ebooks/${book.id}`}
              className="block p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition"
            >
              {book.number && (
                <span className="text-xs font-semibold px-2 py-1 bg-indigo-100 text-indigo-800 rounded mb-2 inline-block">
                  {book.number}
                </span>
              )}
              <h2 className="text-xl font-bold mb-2 text-slate-800">
                {book.title}
              </h2>
              <p className="text-slate-600 text-sm line-clamp-3">
                {book.desc}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
