import Navbar from "../../components/Navbar";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import { useLanguage } from "../../contexts/LanguageContext";
import { useEffect, useState } from "react";
import { fetchEbookIndex, normalizeBook, markdownToBlocks } from "../../lib/r2";
import Watermark from "../../components/Watermark";
import { buyBook } from "../../lib/checkoutClient";
import { BOOK_CATALOG, BUNDLE } from "../../lib/stripe";

// 全量静态预渲染：把 25 本 + 套装在构建时一次性生成 26 个页面。
// 这样该页面变为纯静态，不再需要 Edge/ISR，规避 Cloudflare Edge 运行时限制。
// 价格/标题等 meta 来自 R2 公开桶（CI 可直接访问，无需密钥）。
export async function getStaticPaths() {
  const slugs = [BUNDLE.slug, ...BOOK_CATALOG.map((b) => b.slug)];
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const { slug } = params;
  let meta = {}, previewBlocks = [];
  try {
    // 1. 优先 R2 公开桶
    let index = await fetchEbookIndex();
    // 2. R2 不可用 → 回退本地目录（构建期 Node 上下文，fs 安全）
    if (!Array.isArray(index) || index.length === 0) {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const p = path.join(process.cwd(), "public", "ebooks", "index.json");
        const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
        index = Array.isArray(raw) ? raw.map(normalizeBook) : [];
      } catch (e) {
        console.error("ebooks/[slug] 本地目录兜底失败:", e.message);
      }
    }
    meta = index.find((b) => b.slug === slug) || {};
    // 3. 预览章节：读本地图 preview/{slug}.md（Markdown，构建期 fs 安全）
    try {
      const previewPath = meta.preview ? "/ebooks/" + meta.preview : "";
      if (previewPath) {
        const fs = await import("fs");
        const path = await import("path");
        const previewFile = path.join(process.cwd(), "public", previewPath);
        if (fs.existsSync(previewFile)) {
          const md = fs.readFileSync(previewFile, "utf-8");
          previewBlocks = markdownToBlocks(md);
        }
      }
    } catch {}
    return { props: { meta, previewBlocks, slug } };
  } catch (error) {
    console.error("ebooks/[slug] index fetch failed:", error.message);
    return { props: { meta, previewBlocks, slug } };
  }
}

export default function EbookPage({ meta = {}, previewBlocks = [], slug }) {
  const { lang } = useLanguage();
  const [purchased, setPurchased] = useState(false);
  const [fullBlocks, setFullBlocks] = useState([]);
  const [loadingFull, setLoadingFull] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const displayTitle = meta.title_cn ? (lang === "zh" ? meta.title_cn : meta.title_en) : "Untitled";
  const displayDesc = meta.desc_cn ? (lang === "zh" ? meta.desc_cn : meta.desc_en) : "";
  const isFree = !meta.price || meta.price === 0;
  const totalCh = meta.totalChapters || 1;

  useEffect(() => {
    // 先读本地缓存，再向 /api/purchases 核对服务端真实购买（含套装 bundle-all）
    try {
      const cached = JSON.parse(localStorage.getItem("weacond_purchases") || "[]");
      if (cached.includes(slug) || cached.includes("bundle-all")) setPurchased(true);
    } catch {}
    fetch("/api/purchases", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { slugs: [] }))
      .then((d) => {
        const slugs = Array.isArray(d.slugs) ? d.slugs : [];
        if (slugs.length) localStorage.setItem("weacond_purchases", JSON.stringify(slugs));
        if (slugs.includes(slug) || slugs.includes("bundle-all")) setPurchased(true);
      })
      .catch(() => {});
  }, [slug]);

  const loadFullContent = async () => {
    if (showFull) return;
    setLoadingFull(true);
    try {
      const res = await fetch("/api/ebook-content?slug=" + slug, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFullBlocks(markdownToBlocks(data.content || ""));
        setShowFull(true);
      } else {
        alert(lang === "zh" ? "请先购买此书" : "Please purchase this book first");
      }
    } catch {
      alert(lang === "zh" ? "加载失败" : "Failed to load");
    }
    setLoadingFull(false);
  };

  const toc = previewBlocks.filter((b) => b.type === "h2").map((b, idx) => ({ text: b.text, level: 2 }));
  const canReadFull = isFree || purchased;

  const renderBlock = (block, idx) => {
    if (block.type === "p" || block.type === "paragraph")
      return <p key={idx} className="mb-4 text-gray-700 leading-relaxed">{block.text}</p>;
    if (block.type === "h1")
      return <h1 key={idx} className="text-2xl font-bold mt-6 mb-4 text-gray-900">{block.text}</h1>;
    if (block.type === "h2")
      return <h2 key={idx} id={"heading-" + idx} className="text-xl font-bold mt-5 mb-3 text-gray-800 scroll-mt-24">{block.text}</h2>;
    if (block.type === "h3")
      return <h3 key={idx} className="text-lg font-bold mt-4 mb-2 text-gray-700">{block.text}</h3>;
    if (block.type === "quote")
      return <blockquote key={idx} className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4">{block.text}</blockquote>;
    if (block.type === "bullet" || block.type === "list_item")
      return <li key={idx} className="ml-4 list-disc text-gray-700">{block.text}</li>;
    if (block.type === "callout")
      return <div key={idx} className="p-4 bg-gray-50 rounded-lg my-4 text-gray-600">{block.text}</div>;
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Head>
        <title>{displayTitle} - weacond</title>
        <meta name="description" content={displayDesc} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <Watermark text={displayTitle} />
      <div className="flex">
        <aside className="hidden lg:block w-64 shrink-0 border-r border-gray-200 bg-white sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="p-4 space-y-1">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
              {lang === "zh" ? "目录" : "Contents"}
            </h3>
            {toc.map((item, idx) => (
              <a key={idx} href={"#heading-" + idx} className="block py-2 px-3 rounded-md text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                {item.text}
              </a>
            ))}
            {totalCh > toc.length && (
              <p className="text-xs text-gray-400 mt-2 italic">
                {lang === "zh" ? "+" + (totalCh - toc.length) + " 章需解锁" : "+" + (totalCh - toc.length) + " more locked"}
              </p>
            )}
          </nav>
        </aside>
        <main className="flex-1 max-w-3xl mx-auto px-6 py-12">
          <article
            className="bg-white p-8 rounded-xl shadow-sm border border-gray-100"
            style={{ userSelect: "none", WebkitUserSelect: "none" }}
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            onContextMenu={(e) => { if (!canReadFull) e.preventDefault(); }}
          >
            <div className="mb-8 border-b border-gray-100 pb-6">
              <p className="text-sm text-gray-400 mb-2">
                {meta.number ? (lang === "zh" ? "电子书 " + meta.number : "Ebook " + meta.number) : ""}
              </p>
              <h1 className="text-3xl font-bold text-gray-900">{displayTitle}</h1>
              {displayDesc && <p className="text-gray-500 italic mt-3">{displayDesc}</p>}
            </div>
            <div className="prose max-w-none">
              {previewBlocks.map(renderBlock)}
            </div>
            {!canReadFull && (
              <div className="mt-8 p-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-dashed border-indigo-200 text-center">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {lang === "zh" ? "解锁完整内容" : "Unlock Full Content"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {lang === "zh" ? "已预览第一章，购买后读取全部 " + totalCh + " 章。" : "Previewed Ch.1. Purchase to unlock all " + totalCh + " chapters."}
                </p>
                <div className="flex items-center justify-center gap-3 mb-6">
                  {meta.price > 0 && <span className="text-2xl font-bold text-indigo-600">${meta.price}</span>}
                  <button
                    type="button"
                    onClick={() => buyBook(slug, { titleCn: meta.title_cn, titleEn: meta.title_en })}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                    {lang === "zh" ? "购买并解锁" : "Buy & Unlock"}
                  </button>
                </div>
                <div className="flex justify-center gap-4 text-xs text-gray-400">
                  <span>📄 PDF</span><span>📕 EPUB</span><span>🚀 HTML</span>
                </div>
              </div>
            )}
            {canReadFull && !showFull && (
              <button onClick={loadFullContent} disabled={loadingFull}
                className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {loadingFull ? "..." : (lang === "zh" ? "展示完整内容" : "Show Full")}
              </button>
            )}
            {showFull && (
              <div className="prose max-w-none mt-6">
                {fullBlocks.map(renderBlock)}
              </div>
            )}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                {lang === "zh" ? "下载完整版" : "Download"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {["pdf", "epub", "html"].map((fmt) => (
                  <a key={fmt} href={canReadFull ? "/api/download?slug=" + slug + "&format=" + fmt : "#"}
                    className={"text-center py-3 px-4 rounded-lg text-sm font-medium " + (canReadFull ? "bg-indigo-600 text-white hover:bg-indigo-500" : "bg-slate-100 text-slate-400 cursor-not-allowed")}
                    onClick={(e) => { if (!canReadFull) { e.preventDefault(); alert("请先购买"); } }}>
                    {fmt.toUpperCase()}{!canReadFull ? " 🔒" : ""}
                  </a>
                ))}
              </div>
            </div>
            <p className="mt-6 text-xs text-gray-300 text-center">
              © weacond · 仅供个人使用，禁止复制或传播
            </p>
          </article>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-[9998] w-11 h-11 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center">↑</button>
        </main>
      </div>
    </div>
  );
}