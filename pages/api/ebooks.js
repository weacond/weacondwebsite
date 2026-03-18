import { Client } from "@notionhq/client";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DB_ID = process.env.NOTION_EBOOK_DATABASE_ID;

async function fetchPages(notion, dbId) {
  const all = [];
  let cursor = undefined;
  while (true) {
    const res = await notion.databases.query({
      database_id: dbId,
      start_cursor: cursor,
      page_size: 100
    });
    all.push(...res.results);
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }
  return all;
}

function normalizeLang(langStr) {
  const s = langStr.toLowerCase();
  if (s.includes("cn") && s.includes("en")) return "bilingual";
  if (s.includes("cn")) return "cn";
  if (s.includes("en")) return "en";
  return null;
}

export default async function handler(req, res) {
  if (!NOTION_API_KEY || !DB_ID) {
    return res.status(200).json([]);
  }

  try {
    const notion = new Client({ auth: NOTION_API_KEY });
    const pages = await fetchPages(notion, DB_ID);

    const booksMap = {};

    pages.forEach(page => {
      const props = page.properties;

      const number = props["序号"]?.number || props["Number"]?.number;
      const title = props["书名"]?.title?.[0]?.plain_text || props["Title"]?.title?.[0]?.plain_text || "";
      const link = props["内容链接"]?.url || "";
      const lang = normalizeLang(props["语言"]?.select?.name || "");

      if (!number || !lang) return;

      if (!booksMap[number]) booksMap[number] = { number };
      booksMap[number][lang] = { title, link };
    });

    const books = Object.values(booksMap).sort((a,b) => a.number - b.number);

    return res.status(200).json(books);
  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: "Notion API fetch failed" });
  }
}
