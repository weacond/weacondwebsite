export default function BookCard({ book }) {
  return (
    <a href={`/books/${book.id}`} className="block border p-2 rounded hover:shadow">
      <img src={book.cover} alt={book.title} className="w-full h-40 object-cover"/>
      <p className="mt-2 text-center">{book.title}</p>
    </a>
  );
}
