"use client";
import { useState } from 'react';

export default function Home() {
  const [view, setView] = useState('home'); 
  const [selectedBook, setSelectedBook] = useState<any>(null);

  const booksData = [
    {
      id: 1,
      cluster: "集群一：财富底层逻辑",
      title_cn: "货币的本质与金钱进化论",
      title_en: "Nature of Money & Evolution of Wealth",
      positioning: "核心内容：货币历史、布雷顿森林体系崩塌、法币逻辑、通胀的隐形掠夺、财富在不同周期下的形态（实物 vs 信用）。",
      links: {
        cn: "https://www.notion.so/cn-2eff6e37452f804bb2e3c69e8f814cfd",
        en: "https://www.notion.so/en-english-2eff6e37452f80798c03f73f18ad72ac",
        dual: "https://www.notion.so/Dual-bilingual-2eff6e37452f80dda662e64f2e935781"
      }
    }
  ];

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex justify-center gap-12 py-6 bg-white border-b sticky top-0 z-10">
        <button onClick={() => setView('home')} className={`text-lg font-bold ${view === 'home' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}>首页</button>
        <button onClick={() => setView('library')} className={`text-lg font-bold ${view === 'library' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}>电子书</button>
      </nav>

      {view === 'home' ? (
        <section className="flex flex-col items-center justify-center text-center py-32 px-6 bg-white">
          <h1 className="text-4xl font-black mb-6">让投资变得轻松、方便、稳定。</h1>
          <p className="text-xl text-gray-500 max-w-2xl">Weacond 专注于构建理性投资的教育与智能化系统。</p>
        </section>
      ) : (
        <div className="py-16 px-6 max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-12">WEACOND 财富智库</h2>
          <div className="flex overflow-x-auto gap-8 pb-10">
            {booksData.map((book) => (
              <div key={book.id} onClick={() => setSelectedBook(book)} className="min-w-[300px] bg-white border rounded-2xl p-8 cursor-pointer hover:shadow-xl transition-all text-left">
                <div className="h-40 bg-gray-100 rounded-xl mb-6 flex items-center justify-center font-bold text-gray-300">BOOK COVER</div>
                <h3 className="text-xl font-bold mb-2">{book.title_cn}</h3>
                <p className="text-sm text-gray-400 italic mb-4">{book.title_en}</p>
                <div className="text-blue-600 font-bold underline">查看简介并阅读 →</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedBook && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl max-w-lg w-full p-10 relative">
            <button onClick={() => setSelectedBook(null)} className="absolute top-6 right-6 text-2xl">✕</button>
            <h2 className="text-2xl font-bold mb-4">{selectedBook.title_cn}</h2>
            <p className="text-gray-600 mb-8 bg-gray-50 p-4 rounded-xl text-sm leading-relaxed">{selectedBook.positioning}</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => window.open(selectedBook.links.cn, '_blank')} className="py-4 border rounded-xl font-bold hover:bg-gray-50">华语模式 (CN)</button>
              <button onClick={() => window.open(selectedBook.links.en, '_blank')} className="py-4 border rounded-xl font-bold hover:bg-gray-50">English Mode (EN)</button>
              <button onClick={() => window.open(selectedBook.links.dual, '_blank')} className="py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800">双语对照 (DUAL MODE)</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
