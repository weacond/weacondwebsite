// 500 page
import Head from "next/head";
import Link from "next/link";

export const metadata = { title: '500 — Weacond', robots: { index: false } };

export default function ServerError() {
  return (
    <div className='min-h-screen bg-slate-50 flex items-center justify-center px-4'>
      <Head><title>500 — Weacond</title></Head>
      <div className='text-center'>
        <div className='text-8xl font-black text-red-100 mb-4'>500</div>
        <h1 className='text-2xl font-bold text-slate-900 mb-2'>服务器错误</h1>
        <p className='text-slate-500 mb-8'>请稍后重试。</p>
        <Link href='/' className='bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 transition-colors'>返回首页</Link>
      </div>
    </div>
  );
}
