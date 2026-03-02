import Link from 'next/link';

export default function LibraryPage() {
  const books = Array.from({ length: 20 }, (_, i) => ({ 
    id: i + 1, 
    title: `Reading Strategy Vol.${i + 1}` 
  }));

  return (
    <div className="bg-black min-h-screen pl-32 pt-24 pr-10">
      <header className="mb-20">
        <h2 className="text-5xl font-bold tracking-tighter mb-4">Electronic Library</h2>
        <p className="text-apple-gray text-lg">探索 20+ 本关于黑天鹅防御与期权策略的深度指南。</p>
      </header>

      <div className="flex overflow-x-auto gap-10 pb-24 scrollbar-hide snap-x">
        {books.map((book) => (
          <Link key={book.id} href={`/library/${book.id}`} className="snap-center flex-shrink-0">
            <div className="w-72 h-[28rem] bg-apple-dark border border-[#2c2c2e] rounded-[2rem] p-10 flex flex-col justify-between hover:border-apple-blue transition-all group shadow-2xl">
              <div>
                <div className="w-12 h-1 bg-apple-blue mb-8 opacity-50 group-hover:opacity-100 transition-opacity" />
                <h3 className="text-2xl font-bold leading-tight group-hover:text-white transition-colors">{book.title}</h3>
              </div>
              <div className="space-y-4">
                <p className="text-xs text-apple-gray uppercase tracking-widest">Ready to Read</p>
                <div className="text-apple-blue font-bold group-hover:translate-x-2 transition-transform inline-block">OPEN →</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
