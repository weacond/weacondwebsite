"use client";

import Link from "next/link";

interface BookCardProps {
  id: string;
  title: string;
}

export default function BookCard({ id, title }: BookCardProps) {
  return (
    <Link href={`/book/${id}`} className="block w-40 h-56 bg-slate-700 m-2 p-2 rounded hover:bg-slate-600">
      <div className="text-center font-bold">{title}</div>
      <div className="text-6xl text-center mt-8">{id}</div>
    </Link>
  );
}
