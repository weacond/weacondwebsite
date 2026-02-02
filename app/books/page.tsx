'use client'

import { books } from '../../data/book'
import { useState } from 'react'

export default function BooksPage() {
  const [lang, setLang] = useState('zh')

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4 text-center">电子书库</h1>

      {/* 语言切换 */}
      <div className="flex justify-center mb-6">
        <select className="border px-2 py-1" value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="zh">中文</option>
          <option value="en">English</option>
          <option value="dual">双语</option>
        </select>
      </div>

      {/* 水平滑动书架 */}
      <div className="flex overflow-x-auto space-x-4">
        {books.map((book) => (
          <Link key={book.id} href={`/books/${book.id}`} className="flex-none w-40 h-56 border rounded-lg shadow p-2 hover:shadow-lg flex flex-col justify-center items-center text-center">
            <span className="font-semibold">{book.title[lang]}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
