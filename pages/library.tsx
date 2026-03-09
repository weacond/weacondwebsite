import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import BookCard from "../components/BookCard";
import { useState } from "react";

// 临时示例数据
const books = Array.from({ length: 20 }).map((_, i) => ({
  id: (i+1).toString(),
  title: `Book ${i+1}`,
  cover: (i+1).toString()
}));

export default function LibraryPage() {
  const [lang, setLang] = useState<"CN" | "EN">("CN");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Navbar toggleLang={() => setLang(lang === "CN" ? "EN" : "CN")} />
        <main className="p-8">
          <h1 className="text-3xl font-bold mb-4">{lang === "CN" ? "电子书库" : "Library"}</h1>
          <div className="flex overflow-x-auto gap-4">
            {books.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
