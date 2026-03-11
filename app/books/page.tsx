import { getBooks } from "@/lib/notion";
import BookCard from "@/components/BookCard";

export default async function BooksPage({ searchParams }) {
  const lang = searchParams?.lang || "中文";
  const books = await getBooks(lang);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">电子书馆</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-x-auto">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
      <button onClick={() => router.push(`/books?lang=中文`)}>中文</button>
<button onClick={() => router.push(`/books?lang=English`)}>English</button>
<button onClick={() => router.push(`/books?lang=双语`)}>双语</button>
        ))}
      </div>
    </div>
  );
}
