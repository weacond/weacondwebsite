import { Client } from "@notionhq/client";

/**
 * pages/api/ebooks.js
 * - Requires env vars: NOTION_API_KEY, NOTION_EBOOK_DATABASE_ID (optional for testing)
 * - If Notion info missing or request fails, returns fallback sample data.
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DB_ID = process.env.NOTION_EBOOK_DATABASE_ID;

async function fetchAllPages(notion, database_id) {
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

function safeProp(page, possibleKeys) {
  for (const k of possibleKeys) {
    if (page.properties && page.properties[k]) return page.properties[k];
  }
  return undefined;
}

function normalizeLangKey(raw) {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (["cn", "zh", "中文"].includes(s)) return "cn";
  if (["bilingual", "双语", "both"].includes(s)) return "bilingual";
  if (["en", "english", "英文"].includes(s)) return "en";
  return null;
}

function parsePageToEntry(page) {
  // detect common property keys in Chinese/English
  const titleProp = safeProp(page, ["书名", "Title", "title", "Name"]);
  const numberProp = safeProp(page, ["序号", "Number", "number"]);
  const linkProp = safeProp(page, ["内容链接", "Link", "link", "URL"]);
  const langProp = safeProp(page, ["语言", "Language", "状态", "Status"]);

  // parse number
  const number = numberProp?.number ?? null;
  if (number === null || number === undefined) {
    // no number -> skip this row
    return null;
  }

  // parse language key
  let langKey = null;
  if (langProp?.select?.name) langKey = normalizeLangKey(langProp.select.name);
  else if (langProp?.name) langKey = normalizeLangKey(langProp.name);
  else if (langProp?.rich_text && langProp.rich_text[0]) langKey = normalizeLangKey(langProp.rich_text[0].plain_text);

  if (!langKey) {
    // no valid language -> skip
    return null;
  }

  // parse title text
  let title = "";
  if (titleProp?.title && titleProp.title[0]) title = titleProp.title[0].plain_text;
  else if (titleProp?.rich_text && titleProp.rich_text[0]) title = titleProp.rich_text[0].plain_text;
  else if (titleProp?.plain_text) title = titleProp.plain_text || "";

  // parse description if present
  const descProp = safeProp(page, ["Description", "描述", "说明"]);
  let description = "";
  if (descProp?.rich_text && descProp.rich_text[0]) description = descProp.rich_text[0].plain_text;

  // parse link
  let link = null;
  if (linkProp?.url) link = linkProp.url;
  else if (linkProp?.rich_text && linkProp.rich_text[0]) link = linkProp.rich_text[0].plain_text || null;

  return {
    number,
    langKey,
    title,
    description,
    link
  };
}

const sampleBooks = [
  {
    number: 1,
    cn: { title: "货币的本质 (示例)", description: "示例：这是中文版本。", link: "#" },
    bilingual: { title: "货币的本质 / The Nature (示例)", description: "示例：双语版本。", link: "#" },
    en: { title: "The Nature of Money (Sample)", description: "Sample English description.", link: "#" }
  },
  {
    number: 2,
    cn: { title: "财富心理学 (示例)", description: "示例：这是中文版本。", link: "#" },
    bilingual: { title: "财富心理学 / Wealth Psychology (示例)", description: "示例：双语版本。", link: "#" },
    en: { title: "Wealth Psychology (Sample)", description: "Sample English description.", link: "#" }
  }
];

export default async function handler(req, res) {
  // If Notion env missing, return sample (so front-end won't crash)
  if (!NOTION_API_KEY || !DB_ID) {
    return res.status(200).json(sampleBooks);
  }

  try {
    const notion = new Client({ auth: NOTION_API_KEY });
    const pages = await fetchAllPages(notion, DB_ID);

    const map = {};

    pages.forEach((page) => {
      const entry = parsePageToEntry(page);
      if (!entry) return;

      const { number, langKey, title, description, link } = entry;
      if (!map[number]) map[number] = { number };
      if (!map[number][langKey]) {
        map[number][langKey] = { title, description, link };
      } else {
        // if duplicate, prefer existing; could be enhanced to merge
      }
    });

    const books = Object.values(map).sort((a, b) => a.number - b.number);
    return res.status(200).json(books);
  } catch (err) {
    console.error("Notion API error:", err?.message || err);
    // fallback to sample so UI still works
    return res.status(200).json(sampleBooks);
  }
}
