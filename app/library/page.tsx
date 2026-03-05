import Link from 'next/link';

export default function LibraryPage() {
  // 模拟20本书的数据，实际可结合 Notion API 抓取
  const books = Array.from({ length: 20 }, (_, i) => ({
    id: `book-${i + 1}`,
    title: `Investment Logic Vol. ${i + 1}`,
  }));

  return (
    <div className="bg-[#050505] min-h-screen pl-32 pt-32 pb-20 text-white overflow-hidden">
      <h2 className="text-5xl font-black tracking-tighter mb-20">Library.</h2>
      
      {/* 横向滑动容器 */}
      <div className="flex gap-10 overflow-x-auto pb-20 no-scrollbar snap-x cursor-grab active:cursor-grabbing">
        {books.map((book) => (
          <Link 
            key={book.id} 
            href={`/library/${book.id}`}
            className="snap-center min-w-[320px] h-[480px] bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-12 flex flex-col justify-end hover:border-blue-500/50 transition-all duration-700 group shrink-0"
          >
            <div className="space-y-6">
              <div className="h-0.5 w-10 bg-blue-600"></div>
              <h3 className="text-3xl font-bold leading-tight group-hover:translate-x-2 transition-transform duration-500">
                {book.title}
              </h3>
              <p className="text-[9px] text-white/20 uppercase tracking-[0.4em] font-mono">Premium Access</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
