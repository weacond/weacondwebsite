import { Client } from "@notionhq/client";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DB_ID = process.env.NOTION_EBOOK_DATABASE_ID;

const notion = new Client({ auth: NOTION_API_KEY });

async function fetchAllPages(database_id) {
  const all = [];
  let cursor = undefined;
  while (true) {
    const res = await notion.databases.query({
      database_id,
      start_cursor: cursor,
      page_size: 100
    });
    all.push(...res.results);
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }
  return all;
}

// 获取特定页面的正文
async function getPageContent(blockId) {
  let fullText = "";
  let cursor = undefined;
  try {
    while (true) {
      const { results, has_more, next_cursor } = await notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
      });
      for (const block of results) {
        const type = block.type;
        if (block[type]?.rich_text) {
          fullText += block[type].rich_text.map(t => t.plain_text).join("") + "\n\n";
        }
      }
      if (!has_more) break;
      cursor = next_cursor;
    }
  } catch (e) {
    console.error("Content fetch error:", e);
  }
  return fullText;
}

function safeProp(page, possibleKeys) {
  for (const k of possibleKeys) {
    if (page.properties?.[k]) return page.properties[k];
  }
  return undefined;
}

function normalizeLangKey(raw) {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (["cn", "zh", "中文"].includes(s)) return "cn";
  if (["en", "english", "英文"].includes(s)) return "en";
  if (["bilingual", "双语", "both"].includes(s)) return "bilingual";
  return null;
}

export default async function handler(req, res) {
  if (!NOTION_API_KEY || !DB_ID) return res.status(200).json([]);

  try {
    // 如果请求带有 pageId 参数，则只获取该页正文 (用于按需加载)
    if (req.query.pageId) {
      const content = await getPageContent(req.query.pageId);
      return res.status(200).json({ content });
    }

    // 否则获取书籍列表 (不带正文，保证速度)
    const pages = await fetchAllPages(DB_ID);
    const map = {};

    pages.forEach((page) => {
      const titleProp = safeProp(page, ["书名", "Title", "Name"]);
      const numProp = safeProp(page, ["序号", "Number"]);
      const langProp = safeProp(page, ["语言", "Language"]);
      
      const number = numProp?.number;
      if (number === undefined) return;

      let langKey = normalizeLangKey(langProp?.select?.name || langProp?.rich_text?.[0]?.plain_text);
      if (!langKey) return;

      if (!map[number]) map[number] = { number };
      map[number][langKey] = {
        id: page.id, // 传给前端，点击时再查正文
        title: titleProp?.title?.[0]?.plain_text || titleProp?.rich_text?.[0]?.plain_text || "Untitled"
      };
    });

    const books = Object.values(map).sort((a, b) => a.number - b.number);
    return res.status(200).json(books);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
