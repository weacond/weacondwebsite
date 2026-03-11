"use client";

import BookCard from "../../components/BookCard";

export default function LibraryPage() {
  const books = Array.from({ length: 20 }, (_, i) => ({ id: (i+1).toString(), title: `Book ${i+1}` }));

  return (
    <div className="p-6 flex overflow-x-auto space-x-4">
      {books.map((b) => (
        <BookCard key={b.id} id={b.id} title={b.title} />
      ))}
    </div>
  );
}
