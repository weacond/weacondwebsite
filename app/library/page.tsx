import { books } from '../../data/books'
import BookCard from '../../components/BookCard'

export default function LibraryPage() {
  return (
    <div className="flex overflow-x-auto gap-4 p-4">
      {books.map(book => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  )
}
