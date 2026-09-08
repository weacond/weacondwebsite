import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import Link from "next/link";
import { Client } from "@notionhq/client";

export async function getStaticPaths() {
  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const database_id = process.env.NOTION_EBOOK_DATABASE_ID;
  
  if (!database_id) return { paths: [], fallback: false };

  try {
    const response = await notion.databases.query({ database_id });
    const paths = response.results.flatMap((page) =>
      ["cn", "en", "bilingual"].map((lang) => ({
        params: { slug: `${page.id}-${lang}` },
      }))
    );
    return { paths, fallback: false };
  } catch (e) {
    return { paths: [], fallback: false };
  }
}

export async function getStaticProps({ params }) {
  const { slug } = params;
  
  // ✅ 修复 Bug：正确解析包含连字符的 Notion ID
  const parts = slug.split("-");
  const lang = parts.pop(); // 取出最后一部分作为语言（如 cn, en）
  const pageId = parts.join("-"); // 剩下的部分重新组合成完整的 ID
  
  const notion = new Client({ auth: process.env.NOTION_API_KEY });

  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    const props = page.properties;

    const getContent = (propName) => {
      const prop = props[propName];
      if (!prop) return "";
      if (prop.rich_text) return prop.rich_text.map(t => t.plain_text).join("\n");
      if (prop.title) return prop.title.map(t => t.plain_text).join("\n");
      return "";
    };

    let title = "", description = "", content = "";

    if (lang === "en") {
      title = getContent("English Title");
      description = getContent("English Description");
      content = getContent("English Content");
    } else if (lang === "bilingual") {
       title = `${getContent("书名")} / ${getContent("English Title")}`;
       content = `${getContent("内容")} \n\n ${getContent("English Content")}`;
    } else {
      title = getContent("书名");
      description = getContent("描述");
      content = getContent("内容");
    }

    return {
      props: { title, description, content, pageId, lang },
      revalidate: 60,
    };
  } catch (error) {
    console.error(error);
    return { props: { title: "Error", description: "", content: "Failed to load", pageId, lang } };
  }
}

export default function EbookPage({ title, description, content, pageId, lang }) {
  const { lang: uiLang } = useLanguage();
  const labels = {
    zh: { back: "返回电子书列表", switchLang: "切换语言" },
    en: { back: "Back to Ebooks", switchLang: "Switch language" },
  }[uiLang];

  const langOptions = ["cn", "en", "bilingual"].filter((l) => l !== lang);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/ebooks" className="text-blue-600 hover:underline mb-4 inline-block">
          ← {labels.back}
        </Link>

        <h1 className="text-3xl font-bold mb-4 text-gray-900">{title}</h1>
        <p className="text-gray-600 mb-8 text-lg">{description}</p>

        <div className="text-gray-800 leading-relaxed whitespace-pre-wrap mb-8 text-lg">
          {content}
        </div>

        <div className="border-t pt-4">
          <span className="font-medium mr-2 text-gray-700">{labels.switchLang}:</span>
          {langOptions.map((l) => (
            <Link key={l} href={`/ebooks/${pageId}-${l}`} className="text-blue-600 hover:underline mr-4">
              {l === "cn" ? "中文" : l === "en" ? "English" : "双语"}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
