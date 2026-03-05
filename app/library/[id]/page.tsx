'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function BookDetailPage() {
  const [lang, setLang] = useState<'zh' | 'en' | 'dual'>('zh');
  const [readItems, setReadItems] = useState<string[]>([]);

  // 加载已读记录
  useEffect(() => {
    const saved = localStorage.getItem('weacond_read_chapters');
    if (saved) setReadItems(JSON.parse(saved));
  }, []);

  const toggleRead = (id: string) => {
    const updated = readItems.includes(id) 
      ? readItems.filter(i => i !== id) 
      : [...readItems, id];
    setReadItems(updated);
    localStorage.setItem('weacond_read_chapters', JSON.stringify(updated));
  };

  const chapters = [
    { id: '1', title: 'The Essence of Rationality / 理性的本质' },
    { id: '2', title: 'Market Sentiment Analysis / 市场情绪分析' },
    { id: '3', title: 'Risk Control Framework / 风险控制框架' },
  ];

  return (
    <div className="bg-[#050505] min-h-screen text-white font-sans">
      {/* 顶部语言导航 */}
      <nav className="fixed top-0 w-full p-8 flex justify-between items-center z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
        <Link href="/library" className="text-[10px] tracking-widest font-bold opacity-30 hover:opacity-100 uppercase transition-all">← Back</Link>
        <div className="flex gap-4 bg-white/5 p-1 rounded-full border border-white/10">
          {(['en', 'zh', 'dual'] as const).map((l) => (
            <button 
              key={l}
              onClick={() => setLang(l)}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all ${lang === l ? 'bg-white text-black' : 'text-white/30 hover:text-white'}`}
            >
              {l === 'dual' ? 'Dual' : l}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto pt-48 pb-32 px-6">
        <header className="mb-24 space-y-4">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter italic">Investment Logic Vol. 1</h1>
          <p className="text-white/40 text-xs tracking-widest uppercase">定位：探索稳定盈利的底层逻辑</p>
        </header>

        {/* 章节列表 */}
        <div className="space-y-16">
          {chapters.map((ch) => (
            <div key={ch.id} className="group border-b border-white/5 pb-12">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold tracking-tight text-white/90">{ch.title}</h3>
                <button 
                  onClick={() => toggleRead(ch.id)}
                  className={`text-[9px] font-black px-4 py-1.5 rounded-full border tracking-[0.2em] transition-all ${readItems.includes(ch.id) ? 'bg-blue-600 border-blue-600' : 'border-white/10 text-white/20'}`}
                >
                  {readItems.includes(ch.id) ? '已读' : '未读'}
                </button>
              </div>
              
              <div className="text-white/60 leading-relaxed font-light space-y-6">
                {(lang === 'zh' || lang === 'dual') && <p>这里将展示来自 Notion 的中文文案内容，系统会自动同步最新的编辑结果。</p>}
                {(lang === 'en' || lang === 'dual') && <p className={lang === 'dual' ? 'opacity-40 italic' : ''}>Relevant English logic and market strategies synchronized directly from Notion database.</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
