'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function BookDetailPage() {
  const [lang, setLang] = useState<'zh' | 'en' | 'dual'>('zh');
  const [readChapters, setReadChapters] = useState<string[]>([]);

  // 从本地加载已读状态
  useEffect(() => {
    const saved = localStorage.getItem('weacond_read_chapters');
    if (saved) setReadChapters(JSON.parse(saved));
  }, []);

  const toggleRead = (id: string) => {
    const newList = readChapters.includes(id) 
      ? readChapters.filter(i => i !== id) 
      : [...readChapters, id];
    setReadChapters(newList);
    localStorage.setItem('weacond_read_chapters', JSON.stringify(newList));
  };

  const chapters = [
    { id: '1', title: '理性的本质 / The Essence of Rationality' },
    { id: '2', title: '市场情绪分析 / Market Sentiment Analysis' },
    { id: '3', title: '风险控制框架 / Risk Control Framework' },
  ];

  return (
    <div className="bg-[#050505] min-h-screen text-white font-sans">
      {/* 顶部导航与语言切换 */}
      <nav className="fixed top-0 w-full p-8 flex justify-between items-center z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
        <Link href="/library" className="text-[10px] tracking-widest font-bold opacity-30 hover:opacity-100 uppercase transition-all">← Library</Link>
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
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter italic leading-tight">Investment Logic Vol. 1</h1>
          <p className="text-blue-500 text-[10px] tracking-[0.4em] uppercase font-bold">定位：探索稳定盈利的底层逻辑</p>
        </header>

        {/* 章节滚动列表 */}
        <div className="space-y-16">
          {chapters.map((ch) => (
            <details key={ch.id} className="group border-b border-white/5 pb-12 overflow-hidden" onOpenChange={(e) => { if(e.currentTarget.open) toggleRead(ch.id) }}>
              <summary className="list-none cursor-pointer flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tight text-white/90 group-hover:text-blue-500 transition-colors">{ch.title}</h3>
                <span className={`text-[9px] font-black px-4 py-1.5 rounded-full border tracking-[0.2em] transition-all ${readChapters.includes(ch.id) ? 'bg-blue-600 border-blue-600' : 'border-white/10 text-white/20'}`}>
                  {readChapters.includes(ch.id) ? '已读' : '未读'}
                </span>
              </summary>
              
              <div className="mt-12 text-white/60 leading-relaxed font-light space-y-6 animate-in slide-in-from-top-4 duration-500">
                {(lang === 'zh' || lang === 'dual') && <p>这里将展示来自 Notion 的中文文案内容，系统会自动同步最新的编辑结果。用户无需离开网站即可完成阅读。</p>}
                {(lang === 'en' || lang === 'dual') && <p className={lang === 'dual' ? 'opacity-40 italic mt-4' : ''}>Detailed investment strategies and rational logic synchronized directly from your Notion database. No external redirect required.</p>}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
