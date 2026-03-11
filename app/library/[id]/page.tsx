"use client";

import { usePathname } from "next/navigation";

export default function BookPage() {
  const pathname = usePathname();
  const id = pathname.split("/").pop();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Book {id}</h1>
      <p>书籍内容示例（章节列表）</p>
      <ul className="list-disc pl-6 mt-2">
        {Array.from({ length: 10 }, (_, i) => (
          <li key={i} className="mt-1 cursor-pointer hover:text-white">
            Chapter {i + 1} - 未读
          </li>
        ))}
      </ul>
    </div>
  );
}
