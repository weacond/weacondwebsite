import { useRouter } from "next/router";
import Navbar from "../../components/Navbar";
import Sidebar from "../../components/Sidebar";
import { useState, useEffect } from "react";

const sampleChapters = Array.from({ length: 10 }).map((_, i) => ({
  id: i+1,
  title: `Chapter ${i+1}`
}));

export default function BookDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [lang, setLang] = useState<"CN" | "EN">("CN");
  const [readChapters, setReadChapters] = useState<number[]>([]);

  const toggleChapter = (chapterId: number) => {
    setReadChapters(prev =>
      prev.includes(chapterId) ? prev.filter(c => c !== chapterId) : [...prev, chapterId]
    );
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Navbar toggleLang={() => setLang(lang === "CN" ? "EN" : "CN")} />
        <main className="p-8">
          <h1 className="text-3xl font-bold mb-2">{lang === "CN" ? `书籍 ${id}` : `Book ${id}`}</h1>
          <p className="mb-4">{lang === "CN" ? "简单介绍这本书讲什么" : "Brief description of this book"}</p>
          <div className="flex flex-col gap-2">
            {sampleChapters.map(chapter => (
              <div
                key={chapter.id}
                className={`p-2 border rounded cursor-pointer ${
                  readChapters.includes(chapter.id) ? "bg-green-100" : "bg-white"
                }`}
                onClick={() => toggleChapter(chapter.id)}
              >
                {chapter.title} {readChapters.includes(chapter.id) ? "(已读)" : "(未读)"}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
