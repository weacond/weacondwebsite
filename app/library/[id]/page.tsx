import { books } from '../../../data/books'

export default function BookDetailPage({ params }: { params: { id: string } }) {
  const book = books.find(b => b.id === params.id)
  if (!book) return <div>书籍不存在</div>

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold">{book.titleCN}</h1>
      <h2 className="text-xl">{book.titleEN}</h2>
      <ul className="mt-4 flex flex-col gap-2">
        {book.chapters.map(ch => (
          <li key={ch} className="bg-slate-700 p-2 rounded">{ch}</li>
        ))}
      </ul>
    </div>
  )
}
