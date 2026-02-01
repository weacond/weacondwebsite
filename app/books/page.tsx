'use client'
import { books } from '../../data/book';
import { useState } from 'react';

export default function BooksPage() {
  // 明确 lang 类型
  const [lang, setLang] = useState<'zh' | 'en' | 'dual'>('zh');

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">电子书库</h1>
        <select
          className="border px-2 py-1"
          value={lang}
          onChange={(e) => setLang(e.target.value as 'zh' | 'en' | 'dual')}
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
          <option value="dual">双语</option>
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {books.map((book) => (
          <div key={book.id} className="border p-2 hover:shadow-lg bg-white flex flex-col">
            <div className="h-32 w-full bg-gray-200 flex items-center justify-center mb-2">
              <span className="text-sm">{book.title[lang as 'zh' | 'en' | 'dual']}</span>
            </div>
            <h2 className="font-semibold">{book.title[lang as 'zh' | 'en' | 'dual']}</h2>
            <p className="text-sm mb-2">{book.intro[lang as 'zh' | 'en' | 'dual']}</p>
            {book.notion[lang as 'zh' | 'en' | 'dual'] && (
              <a
                href={book.notion[lang as 'zh' | 'en' | 'dual']}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline mt-auto"
              >
                阅读更多
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
