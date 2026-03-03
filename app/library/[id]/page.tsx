"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lang, setLang] = useState<"cn" | "en" | "bi">("cn");
  const [readStatus, setReadStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = localStorage.getItem("weacond_read_history");
    if (saved) setReadStatus(JSON.parse(saved));
  }, []);

  const markAsRead = (chapterId: string) => {
    const newStatus = { ...readStatus, [chapterId]: true };
    setReadStatus(newStatus);
    localStorage.setItem("weacond_read_history", JSON.stringify(newStatus));
  };

  return (
    <div className="bg-black text-[#f5f5f7] min-h-screen pl-24 pr-10 py-20">
      <Link href="/library" className="text-sm text-[#86868b] hover:text-white mb-10 inline-block">← Back</Link>
      
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold tracking-tighter mb-12">Book Detail</h1>
        
        <div className="flex gap-8 mb-12 border-b border-[#1d1d1f] pb-4">
          <button onClick={() => setLang("cn")} className={`text-xs font-bold tracking-widest ${lang === "cn" ? "text-[#0071e3]" : "text-[#424245]"}`}>中文</button>
          <button onClick={() => setLang("en")} className={`text-xs font-bold tracking-widest ${lang === "en" ? "text-[#0071e3]" : "text-[#424245]"}`}>ENGLISH</button>
          <button onClick={() => setLang("bi")} className={`text-xs font-bold tracking-widest ${lang === "bi" ? "text-[#0071e3]" : "text-[#424245]"}`}>双语 / BILINGUAL</button>
        </div>

        <div className="space-y-6">
          {[1, 2, 3].map((ch) => (
            <div key={ch} onClick={() => markAsRead(`${id}-${ch}`)} className="p-8 bg-[#1c1c1e] rounded-2xl cursor-pointer hover:bg-[#2c2c2e] transition-all flex justify-between items-center group">
              <div className="space-y-2">
                {(lang === "cn" || lang === "bi") && <p className="text-lg">第 {ch} 章节内容展示</p>}
                {(lang === "en" || lang === "bi") && <p className="text-[#86868b]">Chapter {ch} Content Preview</p>}
              </div>
              <span className={`text-[10px] tracking-widest px-4 py-1 rounded-full border ${readStatus[`${id}-${ch}`] ? "border-[#0071e3] text-[#0071e3]" : "border-[#424245] text-[#424245]"}`}>
                {readStatus[`${id}-${ch}`] ? "已读 READ" : "未读 UNREAD"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
