import { Client } from "@notionhq/client";
import Navbar from "../components/Navbar";
import Link from "next/link";
import { useLanguage } from "../contexts/LanguageContext";

export async function getStaticProps() {
  if (!process.env.NOTION_API_KEY || !process.env.NOTION_EBOOK_DATABASE_ID) {
    return { props: { books: [] } };
  }

  const notion = new Client({ auth: process.env.NOTION_API_KEY });

  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_EBOOK_DATABASE_ID,
    });

    const books = response.results
      .map((page) => {
        const props = page.properties;
        const getPropText = (prop) => {
          if (!prop) return "";
          if (prop.title) return prop.title.map((t) => t.plain_text).join("");
          if (prop.rich_text) return prop.rich_text.map((t) => t.plain_text).join("");
          return "";
        };

        return {
          id: page.id,
          number: getPropText(props["Number"]),
          title: getPropText(props["Title"]) || getPropText(props["Name"]),
          desc: getPropText(props["Description"]),
        };
      })
      .filter((book) => book.title.trim() !== "");

    return {
      props: { books },
      revalidate: 60,
    };
  } catch (error) {
    return { props: { books: [] } };
  }
}

export default function EbooksList({ books }) {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">
          {lang === "zh" ? "电子书" : "Ebooks"}
        </h1>
        {books.length === 0 ? (
          <p className="text-gray-500">
            {lang === "zh" ? "暂无电子书内容" : "No ebooks available."}
          </p>
        ) : (
          <div className="space-y-4">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/ebooks/${book.id}`}
                className="block p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold">{book.title}</h2>
                  {book.number && (
                    <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full">
                      {book.number}
                    </span>
                  )}
                </div>
                {book.desc && (
                  <p className="text-gray-600 mt-1 text-sm">{book.desc}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
