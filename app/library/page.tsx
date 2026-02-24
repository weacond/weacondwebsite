import Link from 'next/link';

const books = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, title: `财富智库 Vol.${i + 1}` }));

export default function LibraryPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">电子书库</h1>
      
      {/* 横向滑动容器 */}
      <div className="flex overflow-x-auto gap-6 pb-8 scrollbar-hide">
        {books.map((book) => (
          <Link key={book.id} href={`/library/${book.id}`} className="flex-shrink-0">
            <div className="w-48 h-64 bg-gray-100 border-2 border-gray-200 rounded-lg flex items-center justify-center p-4 hover:border-black transition text-center cursor-pointer shadow-sm">
              <span className="font-bold text-lg">{book.title}</span>
            </div>
          </Link>
        ))}
      </div>
      <p className="text-sm text-gray-400">💡 左右滑动查看更多书籍</p>
    </div>
  );
}
