import Link from 'next/link'
import { Book } from '../data/books'

type BookCardProps = {
  book: Book
}

export default function BookCard({ book }: BookCardProps) {
  return (
    <Link href={`/library/${book.id}`}>
      <a className="flex flex-col items-center bg-slate-700 rounded p-4 m-2 w-32 hover:bg-slate-600">
        <div className="text-2xl font-bold">{book.id}</div> {/* 封面暂时用编号 */}
        <div className="mt-2 text-center">{book.titleCN}</div>
      </a>
    </Link>
  )
}
