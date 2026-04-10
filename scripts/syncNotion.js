import { Client } from "@notionhq/client";
import fs from "fs";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DB_ID = process.env.NOTION_EBOOK_DATABASE_ID;

if (!NOTION_API_KEY || !DB_ID) {
  console.error("Missing Notion API key or DB ID");
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY });

async function fetchAllPages(database_id) {
  const all = [];
  let cursor = undefined;
  while (true) {
    const res = await notion.databases.query({
      database_id,
      start_cursor: cursor,
      page_size: 100,
    });
    all.push(...res.results);
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }
  return all;
}

// 解析 Notion 数据生成 JSON（保留原结构）
function parsePage(page) {
  const safeProp = (keys) => keys.find(k => page.properties[k])?.value;
  // 这里可以根据你原来的 parsePageToEntry 改
  // 最简单示例：
  return {
    number: page.properties["序号"].number,
    cn: {
      title: page.properties["书名"]?.title[0]?.plain_text || "",
      description: page.properties["描述"]?.rich_text[0]?.plain_text || "",
      link: page.properties["内容链接"]?.url || "#"
    },
    en: {
      title: page.properties["英文书名"]?.title[0]?.plain_text || "",
      description: page.properties["英文描述"]?.rich_text[0]?.plain_text || "",
      link: page.properties["英文链接"]?.url || "#"
    }
  };
}

async function main() {
  const pages = await fetchAllPages(DB_ID);
  const books = pages.map(parsePage);
  fs.writeFileSync("data/ebooks.json", JSON.stringify(books, null, 2));
  console.log("ebooks.json updated");
}

main();
