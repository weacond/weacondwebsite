"use client";
import React, { useState } from 'react';

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
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', color: '#111827', fontFamily: 'sans-serif', margin: 0, padding: 0 }}>
      {/* 导航栏 */}
      <nav style={{ display: 'flex', justifyContent: 'center', gap: '40px', padding: '20px', backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
        <button 
          onClick={() => setView('home')} 
          style={{ fontSize: '18px', fontWeight: 'bold', border: 'none', background: 'none', cursor: 'pointer', color: view === 'home' ? '#000000' : '#9ca3af', borderBottom: view === 'home' ? '2px solid #000000' : 'none', paddingBottom: '5px' }}
        >
          首页
        </button>
        <button 
          onClick={() => setView('library')} 
          style={{ fontSize: '18px', fontWeight: 'bold', border: 'none', background: 'none', cursor: 'pointer', color: view === 'library' ? '#000000' : '#9ca3af', borderBottom: view === 'library' ? '2px solid #000000' : 'none', paddingBottom: '5px' }}
        >
          电子书
        </button>
      </nav>

      {/* 首页内容 */}
      {view === 'home' ? (
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '100px 20px', backgroundColor: '#ffffff' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 900, marginBottom: '20px', letterSpacing: '-1px' }}>让投资变得轻松、方便、稳定。</h1>
          <p style={{ fontSize: '20px', color: '#6b7280', maxWidth: '700px', lineHeight: '1.6' }}>
            Weacond 专注于构建理性投资的教育与智能化系统，让每个人都能理解财富增长的本质。
          </p>
        </section>
      ) : (
        /* 电子书库 */
        <div style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 900, marginBottom: '50px' }}>WEACOND 财富智库</h2>
          <div style={{ display: 'flex', overflowX: 'auto', gap: '30px', paddingBottom: '40px' }}>
            {booksData.map((book) => (
              <div 
                key={book.id} 
                onClick={() => setSelectedBook(book)} 
                style={{ minWidth: '280px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '30px', cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.3s' }}
              >
                <div style={{ height: '160px', backgroundColor: '#f3f4f6', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', fontWeight: 'bold' }}>
                  WEACOND BOOK
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>{book.title_cn}</h3>
                <p style={{ fontSize: '14px', color: '#9ca3af', fontStyle: 'italic', marginBottom: '16px' }}>{book.title_en}</p>
                <div style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'underline' }}>查看简介并阅读 →</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 弹窗模式 */}
      {selectedBook && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', maxWidth: '500px', width: '100%', padding: '40px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button 
              onClick={() => setSelectedBook(null)} 
              style={{ position: 'absolute', top: '20px', right: '20px', fontSize: '24px', border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af' }}
            >
              ✕
            </button>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>{selectedBook.title_cn}</h2>
            <p style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '12px', color: '#4b5563', marginBottom: '30px', fontSize: '15px', lineHeight: 1.6 }}>
              {selectedBook.positioning}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => window.open(selectedBook.links.cn, '_blank')} style={{ padding: '15px', border: '1px solid #e5e7eb', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#ffffff' }}>华语模式 (CN)</button>
              <button onClick={() => window.open(selectedBook.links.en, '_blank')} style={{ padding: '15px', border: '1px solid #e5e7eb', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#ffffff' }}>English Mode (EN)</button>
              <button onClick={() => window.open(selectedBook.links.dual, '_blank')} style={{ padding: '15px', backgroundColor: '#000000', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>双语对照 (DUAL MODE)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
