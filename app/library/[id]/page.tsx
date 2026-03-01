import { Client } from "@notionhq/client";

// 初始化 Notion 搬运工
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = "50ada9ed1d6c4942961fc89a29efbed0";

export default async function BookDetailPage({ params }: { params: { id: string } }) {
  // 1. 拿着网址上的数字（比如 5）去 Notion 表里找那一页
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      property: "序号",
      number: { equals: parseInt(params.id) }
    }
  });

  const page = response.results[0];

  return (
    <div className="max-w-3xl mx-auto p-6">
      <nav className="mb-8">← 返回书库</nav>
      
      {/* 2. 显示书名 */}
      <h1 className="text-4xl font-black mb-4 italic">
        {page?.properties["书名"]?.title[0]?.plain_text || "加载中..."}
      </h1>

      {/* 3. 语言切换按钮 */}
      <div className="flex gap-4 mb-8">
        <button className="border px-4 py-1 rounded">中文</button>
        <button className="border px-4 py-1 rounded">EN</button>
      </div>

      <div className="prose">
        <p>这里将实时显示 Notion 里的文字内容...</p>
      </div>
    </div>
  );
}

