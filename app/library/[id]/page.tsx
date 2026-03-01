import { Client } from "@notionhq/client";
import { NotionRenderer } from 'react-notion-x';
import 'react-notion-x/src/styles.css';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function BookDetail({ params }: { params: { id: string } }) {
  const { id } = params;

  // 1. 从 Notion 数据库获取页面 ID
  const response = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID!,
    filter: { property: "序号", number: { equals: parseInt(id) } }
  });

  const page = response.results[0];

  return (
    <div className="max-w-5xl mx-auto p-10">
      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-4 italic">Book Details</h1>
        {/* 语言切换器 */}
        <div className="flex gap-4 border-b pb-4">
          <button className="font-bold border-b-2 border-black">中文 (CN)</button>
          <button className="text-gray-400">English (EN)</button>
          <button className="text-gray-400">双语 (Dual)</button>
        </div>
      </header>

      <main className="grid grid-cols-12 gap-10">
        {/* 章节列表 - 滚动条 */}
        <aside className="col-span-3 h-[600px] overflow-y-auto border-r pr-4">
          <div className="text-xs text-gray-400 mb-4 uppercase">Chapters</div>
          {/* 这里可以循环渲染章节 */}
          <div className="py-2 text-sm text-green-600">✓ 01. 导论 (已读)</div>
          <div className="py-2 text-sm font-bold">02. 核心逻辑 (正在阅读)</div>
        </aside>

        {/* 内容显示区 - 直接抓取自 Notion */}
        <section className="col-span-9">
          <div className="prose max-w-none">
            {/* 提示：这里后续会接入真正的 Notion 内容渲染 */}
            <p>正在同步 Notion 数据库 ID: {id} 的文字内容...</p>
          </div>
        </section>
      </main>
    </div>
  );
}
