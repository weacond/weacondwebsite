import { useState } from 'react';
import Navbar from '../components/Navbar';
import useSWR from 'swr';
import axios from 'axios';

const fetcher = url => axios.get(url).then(res => res.data);

export default function Ebooks() {
  const [lang, setLang] = useState('zh');
  const [bookLang, setBookLang] = useState('zh');

  const { data, error } = useSWR(`/api/ebooks?lang=${bookLang}`, fetcher);

  const labels = {
    zh: { select: '选择书籍语言', read: '阅读' },
    en: { select: 'Select Book Language', read: 'Read' }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar lang={lang} setLang={setLang} />

      <div className="py-20 px-6 max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">{lang === 'zh' ? '电子书' : 'Ebooks'}</h1>

        <div className="mb-8 flex items-center space-x-4">
          <label>{labels[lang].select}:</label>
          <select
            value={bookLang}
            onChange={e => setBookLang(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="zh">华语</option>
            <option value="en">English</option>
            <option value="bilingual">{lang === 'zh' ? '双语' : 'Bilingual'}</option>
          </select>
        </div>

        {error && <p className="text-red-500">加载失败</p>}
        {!data && !error && <p>加载中...</p>}

        {data && (
          <div className="grid md:grid-cols-3 gap-8">
            {data.map(book => (
              <div key={book.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition transform hover:-translate-y-2">
                <h2 className="font-bold text-xl mb-2">{book.title}</h2>
                <p className="text-gray-600 mb-4">{book.description}</p>
                <a href={book.link} target="_blank" className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition">{labels[lang].read}</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
