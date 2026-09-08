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

    const books = response.results.map((page) => {
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
        title: getPropText(props["Title"]),
        desc: getPropText(props["Description"]),
      };
    });

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
        <div className="space-y-4">
          {books.map((book) => (
            <Link
              key={book.id}
              href={`/ebooks/${book.id}`}
              className="block p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition"
            >
              <span className="text-sm font-semibold text-blue-600 block mb-1">
                {book.number}
              </span>
              <h2 className="text-xl font-bold">{book.title}</h2>
              {book.desc && (
                <p className="text-gray-600 mt-2">{book.desc}</p>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
