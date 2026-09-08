import { Client } from "@notionhq/client";
import Navbar from "../../components/Navbar";
import Link from "next/link";
import { useRouter } from "next/router";
import { useLanguage } from "../../contexts/LanguageContext";
import { useEffect, useState } from "react";

export async function getStaticPaths() {
  if (!process.env.NOTION_API_KEY || !process.env.NOTION_EBOOK_DATABASE_ID) {
    return { paths: [], fallback: "blocking" };
  }

  const notion = new Client({ auth: process.env.NOTION_API_KEY });

  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_EBOOK_DATABASE_ID,
    });

    const paths = response.results.map((page) => ({
      params: { slug: page.id },
    }));

    return { paths, fallback: "blocking" };
  } catch (e) {
    return { paths: [], fallback: "blocking" };
  }
}

export async function getStaticProps({ params }) {
  const { slug } = params;

  if (!process.env.NOTION_API_KEY || !slug) {
    return {
      props: {
        number: "",
        title: "Error Loading Book",
        desc: "",
        contentBlocks: [],
      },
    };
  }

  const notion = new Client({ auth: process.env.NOTION_API_KEY });

  try {
    const pageId = slug.replace(/-/g, "");
    
    let title = "";
    let number = "";
    let desc = "";

    try {
      const page = await notion.pages.retrieve({ page_id: pageId });
      const props = page.properties;

      const getText = (prop) => {
        if (!prop) return "";
        if (prop.title) return prop.title.map((t) => t.plain_text).join("");
        if (prop.rich_text) return prop.rich_text.map((t) => t.plain_text).join("");
        return "";
      };

      title = getText(props["Title"]) || getText(props["Name"]);
      number = getText(props["Number"]);
      desc = getText(props["Description"]);
    } catch (e) {}

    let contentBlocks = [];
    let nextCursor = null;

    do {
      const blocksResponse = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100,
        start_cursor: nextCursor || undefined,
      });

      blocksResponse.results.forEach((block) => {
        const type = block.type;
        const value = block[type];
        const text = value?.rich_text?.map((t) => t.plain_text).join("") || "";

        if (type === "paragraph" && text) {
          contentBlocks.push({ type: "p", text });
        } else if (type.startsWith("heading_") && text) {
          const level = type.replace("heading_", "");
          contentBlocks.push({ type: `h${level}`, text });
        } else if (type === "quote" && text) {
          contentBlocks.push({ type: "quote", text });
        } else if (type === "bulleted_list_item" && text) {
          contentBlocks.push({ type: "bullet", text });
        } else if (type === "numbered_list_item" && text) {
          contentBlocks.push({ type: "number", text });
        } else if (type === "callout" && text) {
          contentBlocks.push({ type: "callout", text });
        }
      });

      nextCursor = blocksResponse.next_cursor;
    } while (nextCursor);

    return {
      props: {
        number,
        title: title || "Untitled",
        desc,
        contentBlocks,
      },
      revalidate: 60,
    };
  } catch (error) {
    console.error("Notion API Error:", error);
    return {
      props: {
        number: "",
        title: "Error Loading Book",
        desc: "",
        contentBlocks: [
          { type: "p", text: "Failed to load content. Please try again later." },
        ],
      },
    };
  }
}

export default function EbookPage({ number, title, desc, contentBlocks }) {
  const { lang, setLang } = useLanguage();
  const router = useRouter();
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    if (!router.query.slug) return;
    const currentSlug = router.query.slug;

    const savedPosition = localStorage.getItem(`ebook_progress_${currentSlug}`);
    if (savedPosition) {
      setTimeout(() => {
        window.scrollTo({
          top: parseFloat(savedPosition),
          behavior: "smooth",
        });
      }, 100);
    }

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
      <div
        className="fixed top-0 left-0 h-1 bg-blue-600 z-50 transition-all duration-150 ease-out"
        style={{ width: `${readingProgress}%` }}
      />

      <Navbar />

      <main className="max-w-4xl mx-auto px-4 pt-36 pb-12">
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
          {number && (
            <span className="text-sm font-semibold text-blue-600 mb-2 block">{number}</span>
          )}
          <h1 className="text-3xl font-bold mb-4">{title}</h1>
          {desc && <p className="text-gray-600 italic mb-6 text-lg border-l-4 border-blue-500 pl-4">{desc}</p>}

          <hr className="my-6 border-gray-200" />

          <div className="prose max-w-none text-gray-800 leading-relaxed space-y-4">
            {contentBlocks.map((block, idx) => {
              if (block.type === "p") return <p key={idx} className="mb-4">{block.text}</p>;
              if (block.type === "h1") return <h1 key={idx} className="text-2xl font-bold mt-6 mb-4">{block.text}</h1>;
              if (block.type === "h2") return <h2 key={idx} className="text-xl font-bold mt-5 mb-3">{block.text}</h2>;
              if (block.type === "h3") return <h3 key={idx} className="text-lg font-bold mt-4 mb-2">{block.text}</h3>;
              if (block.type === "quote") return <blockquote key={idx} className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4">{block.text}</blockquote>;
              if (block.type === "bullet") return <li key={idx} className="ml-4 list-disc">{block.text}</li>;
              if (block.type === "number") return <li key={idx} className="ml-4 list-decimal">{block.text}</li>;
              if (block.type === "callout") return <div key={idx} className="p-4 bg-gray-100 rounded-lg my-4">{block.text}</div>;
              return null;
            })}
          </div>
        </article>
      </main>
    </div>
  );
}
