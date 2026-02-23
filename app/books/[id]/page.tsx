import Link from "next/link";
import { books } from "@/data/books";

export default function BookPage({ params }: any) {
  const book = books.find((b) => b.id === params.id);

  if (!book) return <div>Not Found</div>;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold mb-4">
        {book.title}
      </h2>

      <p className="text-neutral-600 mb-12">
        {book.description}
      </p>

      <div className="space-y-4">
        {book.chapters.map((chapter) => (
          <div key={chapter.id}>
            {chapter.ready ? (
              <Link
                href={`/reader/${book.id}/${chapter.id}`}
                className="hover:text-neutral-500 transition"
              >
                {chapter.title}
              </Link>
            ) : (
              <span className="text-neutral-400">
                {chapter.title}（更新中）
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
