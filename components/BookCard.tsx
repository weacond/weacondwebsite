import Link from "next/link";

export default function BookCard({ book }: { book: any }) {
  return (
    <Link href={`/book/${book.id}`}>
      <div className="w-36 h-48 bg-white shadow flex items-center justify-center font-bold text-2xl cursor-pointer">
        {book.cover || book.id} {/* 封面暂时用编号 */}
      </div>
    </Link>
  );
}
