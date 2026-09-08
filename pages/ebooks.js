import { Client } from "@notionhq/client";
import Navbar from "../../components/Navbar";
import Link from "next/link";
import { useRouter } from "next/router";
import { useLanguage } from "../../contexts/LanguageContext";
import { useEffect, useState } from "react";

// --- 1. 静态路径生成 ---
export async function getStaticPaths() {
  // 安全检查：如果没有配置 Key，直接返回空，避免报错
  if (!process.env.NOTION_API_KEY || !process.env.NOTION_EBOOK_DATABASE_ID) {
    return { paths: [], fallback: false };
  }

  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const database_id = process.env.NOTION_EBOOK_DATABASE_ID;

  try {
    const response = await notion.databases.query({ database_id });
    const paths = response.results.map((page) => ({
      params: { slug: page.id },
    }));
    // 使用 blocking 模式，允许访问未预构建的页面
    return { paths, fallback: "blocking" };
  } catch (e) {
    console.error("Notion API Error in getStaticPaths:", e);
    return { paths: [], fallback: false };
  }
}

// --- 2. 静态属性获取 (含长文分页逻辑) ---
export async function getStaticProps({ params }) {
  const { slug } = params;
  
  // 安全检查
  if (!process.env.NOTION_API_KEY) {
    return { props: { title: "Error", contentBlocks: [] } };
  }

  const notion = new Client({ auth: process.env.NOTION_API_KEY });

  try {
    // 1. 获取页面元数据
    const page = await notion.pages.retrieve({ page_id: slug });
    const props = page.properties;

    const getText = (prop) => {
      if (!prop) return "";
      if (prop.title) return prop.title.map((t) => t.plain_text).join("");
      if (prop.rich_text) return prop.rich_text.map((t) => t.plain_text).join("");
      return "";
    };

    // 2. 分页获取正文 (核心修复：防止长文截断)
    let contentBlocks = [];
    let nextCursor = null;
    
    // 循环直到没有更多数据
    do {
      const blocksResponse = await notion.blocks.children.list({
        block_id: slug,
        page_size: 100, // Notion 允许的最大值
        start_cursor: nextCursor,
      });
      
      blocksResponse.results.forEach((block) => {
        // 使用 Optional Chaining (?.) 防止空指针崩溃
        if (block.type === "paragraph") {
          const text = block.paragraph?.rich_text?.map((t) => t.plain_text).join("");
          if (text) contentBlocks.push({ type: 'p', text });
        }
        if (block.type.startsWith("heading")) {
          const text = block[block.type]?.rich_text?.map((t) => t.plain_text).join("");
          const level = block.type.replace("heading_", "");
          if (text) contentBlocks.push({ type: `h${level}`, text });
        }
        if (block.type === "quote") {
           const text = block.quote?.rich_text?.map((t) => t.plain_text).join("");
           if (text) contentBlocks.push({ type: 'quote', text });
        }
      });

      nextCursor = blocksResponse.next_cursor;
    } while (blocksResponse.has_more);

    return {
      props: {
        number: getText(props["Number"]),
        title: getText(props["Title"]),
        desc: getText(props["Description"]),
        contentBlocks: contentBlocks,
      },
      revalidate: 60, // 每 60 秒增量生成一次
    };
  } catch (error) {
    console.error("Notion API Error in getStaticProps:", error);
    return {
      props: {
        number: "",
        title: "Error Loading Book",
        desc: "",
        contentBlocks: [{ type: 'p', text: "Failed to load content. Please try again later." }],
      },
    };
  }
}

// --- 3. 页面组件 (含阅读进度) ---
export default function EbookPage({ number, title, desc, contentBlocks }) {
  const { lang, setLang } = useLanguage();
  const router = useRouter();
  const [readingProgress, setReadingProgress] = useState(0);

  // 阅读进度逻辑
  useEffect(() => {
    if (!router.query.slug) return;
    const currentSlug = router.query.slug;

    // 恢复进度
    const savedPosition = localStorage.getItem(`ebook_progress_${currentSlug}`);
    if (savedPosition) {
      setTimeout(() => {
        window.scrollTo({
          top: parseFloat(savedPosition),
          behavior: "smooth",
        });
      }, 100);
    }

    // 保存进度
    let timer = null;
    const handleScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const currentScrollY = window.scrollY;
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        
        if (totalHeight > 0) {
          const progress = Math.min(100, Math.max(0, (currentScrollY / totalHeight) * 100));
          setReadingProgress(progress);
          localStorage.setItem(`ebook_progress_${currentSlug}`, currentScrollY.toString());
        }
      }, 200);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timer) clearTimeout(timer);
    };
  }, [router.query.slug]);

  const handleLangSwitch = () => {
    setLang(lang === "zh" ? "en" : "zh");
    router.push("/ebooks");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* 顶部进度条 */}
      <div 
        className="fixed top-0 left-0 h-1 bg-blue-600 z-50 transition-all duration-150 ease-out"
        style={{ width: `${readingProgress}%` }}
      />
      
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Link href="/ebooks" className="text-blue-600 hover:underline flex items-center">
            ← {lang === "zh" ? "返回列表" : "Back to List"}
          </Link>
          <button 
            onClick={handleLangSwitch}
            className="text-sm text-gray-500 hover:text-blue-600 font-medium"
          >
            {lang === "zh" ? "Switch to English" : "切换中文"}
          </button>
        </div>

        <article className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <span className="text-sm font-semibold text-blue-600 mb-2 block">{number}</span>
          <h1 className="text-3xl font-bold mb-4">{title}</h1>
          {desc && <p className="text-gray-600 italic mb-6 text-lg border-l-4 border-blue-500 pl-4">{desc}</p>}
          
          <hr className="my-6 border-gray-200" />
          
          <div className="prose max-w-none text-gray-800 leading-relaxed space-y-4">
            {contentBlocks.map((block, idx) => {
              if (block.type === 'p') return <p key={idx} className="mb-4">{block.text}</p>;
              if (block.type === 'h1') return <h1 key={idx} className="text-2xl font-bold mt-6 mb-4">{block.text}</h1>;
              if (block.type === 'h2') return <h2 key={idx} className="text-xl font-bold mt-5 mb-3">{block.text}</h2>;
              if (block.type === 'h3') return <h3 key={idx} className="text-lg font-bold mt-4 mb-2">{block.text}</h3>;
              if (block.type === 'quote') return <blockquote key={idx} className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4">{block.text}</blockquote>;
              return null;
            })}
          </div>
        </article>
      </main>
    </div>
  );
}
