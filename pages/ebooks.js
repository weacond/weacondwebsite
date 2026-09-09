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
    console.error(error);
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
      return num.endsWith("-cn") || num.endsWith("cn") || num.includes("cn");
    }
    return num.endsWith("-en") || num.endsWith("en") || num.includes("en");
  });

  const getSequence = (num) => {
    if (!num) return "";
    return num.split("-")[0];
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="bg-white border-b border-slate-200 py-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            {currentLang === "zh" ? "投资书房" : "Investment Library"}
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {currentLang === "zh"
              ? "精选 20+ 经典著作，构建你的理性思维系统。"
              : "20+ curated classics to build your rational thinking system."}
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {filteredBooks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">
              {currentLang === "zh"
                ? "暂无该语言版本的书籍"
                : "No books available in this language."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBooks.map((book) => (
              <Link
                key={book.id}
                href={`/ebooks/${book.id}`}
                className="group block bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 overflow-hidden"
              >
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-indigo-600 tracking-wider">
                    #{getSequence(book.number)}
                  </span>
                  <span className="text-xs text-slate-400 group-hover:text-indigo-500 transition-colors">
                    {currentLang === "zh" ? "阅读" : "Read"} →
                  </span>
                </div>

                <div className="p-6">
                  <h2 className="text-xl font-bold mb-3 text-slate-800 group-hover:text-indigo-700 transition-colors line-clamp-2">
                    {book.title}
                  </h2>
                  <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                    {book.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
