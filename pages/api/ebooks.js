import { Client } from "@notionhq/client";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DB_ID = process.env.NOTION_EBOOK_DATABASE_ID;

async function getPageContent(notion, blockId) {
  let fullText = "";
  let cursor = undefined;

  while (true) {
    const { results, has_more, next_cursor } = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
    });

    for (const block of results) {
      const type = block.type;
      const content = block[type];

      if (content?.rich_text) {
        const text = content.rich_text.map((t) => t.plain_text).join("");
        fullText += text + "\n\n";
      }

      // Recursive call if block has children (e.g., nested lists)
      if (block.has_children) {
        fullText += await getPageContent(notion, block.id);
      }
    }

    if (!has_more) break;
    cursor = next_cursor;
  }
  return fullText;
}

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
  const titleProp = safeProp(page, ["书名", "Title", "title", "Name"]);
  const numberProp = safeProp(page, ["序号", "Number", "number"]);
  const langProp = safeProp(page, ["语言", "Language", "状态", "Status"]);

  const number = numberProp?.number ?? null;
  if (number === null) return null;

  let langKey = null;
  if (langProp?.select?.name) langKey = normalizeLangKey(langProp.select.name);
  else if (langProp?.rich_text?.[0]) langKey = normalizeLangKey(langProp.rich_text[0].plain_text);

  if (!langKey) return null;

  let title = "";
  if (titleProp?.title?.[0]) title = titleProp.title[0].plain_text;
  else if (titleProp?.rich_text?.[0]) title = titleProp.rich_text[0].plain_text;

  return {
    id: page.id, // Needed to fetch content
    number,
    langKey,
    title
  };
}

export default async function handler(req, res) {
  if (!NOTION_API_KEY || !DB_ID) {
    return res.status(200).json({ message: "No API Key or DB ID" });
  }

  try {
    const notion = new Client({ auth: NOTION_API_KEY });
    const pages = await fetchAllPages(notion, DB_ID);
    const map = {};

    for (const page of pages) {
      const entry = parsePageToEntry(page);
      if (!entry) continue;

      const { id, number, langKey, title } = entry;
      
      // Fetch the actual text content of the page
      const content = await getPageContent(notion, id);

      if (!map[number]) map[number] = { number };
      map[number][langKey] = { 
        title, 
        content // Adding the extracted text here
      };
    }

    const books = Object.values(map).sort((a, b) => a.number - b.number);
    return res.status(200).json(books);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

