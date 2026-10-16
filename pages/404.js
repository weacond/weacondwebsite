// 404 page
import Head from "next/head";
import Link from "next/link";

export const metadata = { title: '404 — Weacond', robots: { index: false } };

export default function NotFound() {
  return (
    <div className='min-h-screen bg-slate-50 flex items-center justify-center px-4'>
      <Head><title>404 — Weacond</title></Head>
      <div className='text-center'>
        <div className='text-8xl font-black text-indigo-100 mb-4'>404</div>
        <h1 className='text-2xl font-bold text-slate-900 mb-2'>页面未找到</h1>
        <p className='text-slate-500 mb-8'>你访问的页面不存在或已被移动。</p>
        <div className='flex gap-4 justify-center'>
          <Link href='/' className='bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 transition-colors'>返回首页</Link>
          <Link href='/ebooks' className='bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-lg font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-colors'>浏览电子书</Link>
        </div>
      </div>
    </div>
  );
}
