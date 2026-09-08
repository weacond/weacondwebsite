import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import Link from "next/link";
import { Client } from "@notionhq/client";

// 1. 获取所有电子书数据用于列表展示
export async function getStaticProps() {
  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const database_id = process.env.NOTION_EBOOK_DATABASE_ID;
  
  if (!database_id) return { props: { ebooks: [] } };

  try {
    const response = await notion.databases.query({ database_id });
    // 提取书名和 ID
    const ebooks = response.results.map((page) => ({
      id: page.id,
      title: page.properties["书名"]?.title?.[0]?.plain_text || "未命名书籍",
      englishTitle: page.properties["English Title"]?.title?.[0]?.plain_text || "",
      description: page.properties["描述"]?.rich_text?.map(t => t.plain_text).join("") || "",
    }));
    return { props: { ebooks }, revalidate: 60 };
  } catch (e) {
    console.error("Failed to fetch ebooks:", e);
    return { props: { ebooks: [] } };
  }
}

export default function EbooksList({ ebooks }) {
  const { lang } = useLanguage();
  
  const labels = {
    zh: { title: "电子书图书馆", noBooks: "暂无电子书，请检查 Notion 配置。", read: "阅读" },
    en: { title: "Ebook Library", noBooks: "No ebooks available. Please check Notion config.", read: "Read" },
  }[lang];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">{labels.title}</h1>
        
        {ebooks.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            {labels.noBooks}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {ebooks.map((book) => (
              <Link 
                key={book.id} 
                href={`/ebooks/${book.id}-cn`} 
                className="block bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
              >
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">{book.title}</h2>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{book.englishTitle}</p>
                  <p className="text-gray-600 text-sm line-clamp-3 mb-4">{book.description}</p>
                  <div className="text-blue-600 font-medium text-sm flex items-center">
                    {labels.read} &rarr;
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
