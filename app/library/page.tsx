export default function LibraryPage() {
  const books = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, title: `书名示例 ${i + 1}` }));

  return (
    <div className="bg-black min-h-screen pl-32 pt-20">
      <h2 className="text-4xl font-bold text-white mb-12 tracking-tight">电子书库 / Library</h2>
      
      {/* 横向滑动容器 */}
      <div className="flex overflow-x-auto gap-8 pb-20 pr-10 scrollbar-hide snap-x">
        {books.map((book) => (
          <Link key={book.id} href={`/library/${book.id}`} className="snap-center flex-shrink-0">
            <div className="w-64 h-96 bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl flex flex-col items-center justify-center p-8 hover:border-[#0071e3] transition-all group">
              <div className="text-center font-bold text-[#86868b] group-hover:text-white transition-colors">
                <p className="text-xs uppercase tracking-widest mb-2 opacity-50">Volume {book.id}</p>
                <p className="text-xl">{book.title}</p>
              </div>
              <div className="mt-auto opacity-0 group-hover:opacity-100 transition-opacity text-[#0071e3] text-sm">
                点击阅读 →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
