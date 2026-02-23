import Link from "next/link";
import { books } from "@/data/books";

export default function LibraryPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-12">
        电子书库
      </h2>

      <div className="flex gap-8 overflow-x-auto pb-4">
        {books.map((book) => (
          <Link
            key={book.id}
            href={`/book/${book.id}`}
            className="min-w-[220px] border border-neutral-200 p-6 hover:shadow-md transition"
          >
            <p className="text-lg font-medium">
              {book.title}
            </p>

            <p className="text-sm text-neutral-500 mt-3">
              {book.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
