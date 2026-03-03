import Link from 'next/link';
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function LibraryPage() {
  const response = await notion.databases.query({
    database_id: "50ada9ed1d6c4942961fc89a29efbed0",
    sorts: [{ property: "序号", direction: "ascending" }],
  });

  return (
    <div className="bg-black min-h-screen pl-32 pt-24 pr-10">
      <h2 className="text-5xl font-bold text-white mb-16 tracking-tighter">电子书库 / Library</h2>
      
      <div className="flex overflow-x-auto gap-10 pb-24 scrollbar-hide snap-x">
        {response.results.map((page: any) => (
          <Link key={page.id} href={`/library/${page.id}`} className="snap-center flex-shrink-0">
            <div className="w-72 h-[28rem] bg-[#1c1c1e] border border-[#2c2c2e] rounded-[2rem] p-10 flex flex-col justify-between hover:border-[#0071e3] transition-all group shadow-2xl">
              <div>
                <div className="w-12 h-1 bg-[#0071e3] mb-8 opacity-50 group-hover:opacity-100 transition-opacity" />
                <h3 className="text-2xl font-bold leading-tight text-[#f5f5f7]">
                  {page.properties["书名"]?.title[0]?.plain_text || "Untitled"}
                </h3>
              </div>
              <div className="text-[#0071e3] font-bold group-hover:translate-x-2 transition-transform">
                READ NOW →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
