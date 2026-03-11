import { getBookChapters } from "@/lib/notion";
import { useState } from "react";

export default async function BookDetail({ params }) {
  const { id } = params;
  const chapters = await getBookChapters(id);
  const [currentChapter, setCurrentChapter] = useState(0);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">{chapters[currentChapter]?.title}</h1>
      <div className="mt-4">{chapters[currentChapter]?.content}</div>
      <div className="mt-6 flex justify-between">
        <button
          disabled={currentChapter === 0}
          onClick={() => setCurrentChapter((c) => c - 1)}
        >
          上一章
        </button>
        <button
          disabled={currentChapter === chapters.length - 1}
          onClick={() => setCurrentChapter((c) => c + 1)}
        >
          下一章
        </button>
      </div>
    </div>
  );
}
