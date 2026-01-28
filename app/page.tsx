"use client";
import { useState } from 'react';
import booksData from '../data/books.json'; // 确保你之前创建了此文件

export default function Home() {
  const [view, setView] = useState('home'); // 控制视图：home 或 library
  const [selectedBook, setSelectedBook] = useState(null); // 控制弹窗

  // 渲染主页内容
  const renderHero = () => (
    <>
      <section className="flex flex-col items-center justify-center text-center py-24 px-6 bg-white shadow-sm">
        <h1 className="text-4xl font-bold mb-4">让投资变得轻松、方便、稳定。</h1>
        <p className="text-lg text-gray-600 max-w-2xl">专注于构建理性投资的教育与智能化系统。</p>
      </section>
      {/* 你原本的其他 Section 可以继续放在这里 */}
    </>
  );

  // 渲染电子书滑动库
  const renderLibrary = () => (
    <div className="py-12 px-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-8 text-center">Weacond 财富智库</h2>
      
      <div className="flex overflow-x-auto gap-6 pb-8 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
        {booksData.map((book) => (
          <div 
            key={book.id} 
            onClick={() => setSelectedBook(book)}
            className="min-w-[280px] bg-white border-2 border-gray-100 rounded-xl p-6 cursor-pointer hover:border-black transition-all shadow-sm"
            style={{ scrollSnapAlign: 'start' }}
          >
            <div className="h-40 bg-gray-200 rounded mb-4 flex items-center justify-center text-gray-400">书封图占位</div>
            <p className="text-xs font-bold text-gold mb-1">{book.cluster}</p>
            <h3 className="text-xl font-bold mb-1">{book.title_cn}</h3>
            <p className="text-sm text-gray-500">{book.title_en}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800">
      {/* 顶部导航栏 */}
      <nav className="flex justify-center gap-8 py-4 bg-white border-b sticky top-0 z-10">
        <button onClick={() => setView('home')} className={`font-medium ${view === 'home' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}>主页</button>
        <button onClick={() => setView('library')} className={`font-medium ${view === 'library' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}>电子书</button>
      </nav>

      {/* 内容切换 */}
      {view === 'home' ? renderHero() : renderLibrary()}

      {/* 电子书详情弹窗 (Modal) */}
      {selectedBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl relative">
            <button onClick={() => setSelectedBook(null)} className="absolute top-4 right-4 text-2xl">×</button>
            <h2 className="text-2xl font-bold mb-2">{selectedBook.title_cn}</h2>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">{selectedBook.positioning}</p>
            
            <div className="flex flex-col gap-3">
              <button onClick={() => window.open(selectedBook.links.cn, '_blank')} className="w-full py-3 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">华语模式 (CN)</button>
              <button onClick={() => window.open(selectedBook.links.en, '_blank')} className="w-full py-3 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">English Mode (EN)</button>
              <button onClick={() => window.open(selectedBook.links.dual, '_blank')} className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-bold italic">Dual Mode (推荐)</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-10 text-center text-gray-400 text-sm">
        © 2026 Weacond. 让投资回归理性。
      </footer>
    </main>
  );
}
