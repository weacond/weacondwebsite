'use client'
import { books } from '../../data/book';
import { useState } from 'react';

export default function BooksPage() {
  const [lang, setLang] = useState('zh');

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">电子书库</h1>
        <select className="border px-2 py-1" value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="zh">中文</option>
          <option value="en">English</option>
          <option value="dual">双语</option>
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {books.map((book) => (
          <div key={book.id} className="border p-2 hover:shadow-lg bg-white flex flex-col">
            <div className="h-32 w-full bg-gray-200 flex items-center justify-center mb-2">
              <span className="text-sm">{book.title[lang]}</span>
            </div>
            <h2 className="font-semibold">{book.title[lang]}</h2>
            <p className="text-sm mb-2">{book.intro[lang]}</p>
            {book.notion[lang] && (
              <a href={book.notion[lang]} target="_blank" className="text-blue-500 hover:underline mt-auto">
                阅读更多
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
