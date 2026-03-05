'use client';
import { useState, useEffect } from 'react';

export default function BookDetailPage({ params }: { params: { id: string } }) {
  const [language, setLanguage] = useState<'zh' | 'en' | 'dual'>('zh');
  const [readChapters, setReadChapters] = useState<string[]>([]);

  // 从浏览器读取已读状态
  useEffect(() => {
    const saved = localStorage.getItem('weacond_read_chapters');
    if (saved) setReadChapters(JSON.parse(saved));
  }, []);

  const markAsRead = (chapterId: string) => {
    if (!readChapters.includes(chapterId)) {
      const newList = [...readChapters, chapterId];
      setReadChapters(newList);
      localStorage.setItem('weacond_read_chapters', JSON.stringify(newList));
    }
  };

  return (
    <div className="bg-[#050505] min-h-screen text-white p-10 md:p-32">
      {/* 语言切换器 */}
      <div className="fixed top-10 right-10 flex gap-4 bg-white/5 p-2 rounded-full backdrop-blur-md z-50">
        {['en', 'zh', 'dual'].map((l) => (
          <button 
            key={l}
            onClick={() => setLanguage(l as any)}
            className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${language === l ? 'bg-white text-black' : 'text-white/40'}`}
          >
            {l === 'dual' ? 'Dual' : l}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto space-y-20">
        <header className="space-y-4">
          <h1 className="text-5xl font-black tracking-tighter italic">Book Title</h1>
          <p className="text-white/40 font-light tracking-widest uppercase text-xs">Category: Premium Investment Logic</p>
        </header>

        {/* 章节列表 */}
        <div className="space-y-8">
          {[1, 2, 3].map((chapter) => (
            <details 
              key={chapter} 
              onOpenChange={() => markAsRead(`ch-${chapter}`)}
              className="group border-b border-white/5 pb-8"
            >
              <summary className="list-none cursor-pointer flex items-center justify-between">
                <span className="text-2xl font-bold group-hover:text-blue-500 transition-colors">
                  Chapter {chapter}: The Core Strategy
                </span>
                <span className={`text-[10px] px-3 py-1 rounded-full border ${readChapters.includes(`ch-${chapter}`) ? 'border-blue-500 text-blue-500' : 'border-white/10 text-white/10'}`}>
                  {readChapters.includes(`ch-${chapter}`) ? 'READ' : 'UNREAD'}
                </span>
              </summary>
              <div className="mt-10 leading-relaxed text-white/70 space-y-6 font-light">
                {language === 'zh' && <p>这里是中文文案内容...</p>}
                {language === 'en' && <p>Here is the English content...</p>}
                {language === 'dual' && <p className="border-l-2 border-blue-500 pl-6 italic">中文 + English dual content logic...</p>}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
