import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-48 bg-gray-100 p-4 flex flex-col gap-2">
      <Link href="/library" className="hover:bg-gray-200 p-2 rounded">我的业务</Link>
      <Link href="/library" className="hover:bg-gray-200 p-2 rounded">电子书库</Link>
    </aside>
  );
}
