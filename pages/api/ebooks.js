import { Client } from "@notionhq/client";

/**
 * API behavior:
 * - Reads ALL rows from the Notion database (paged)
 * - Sorts by Number/序号 asc
 * - Groups rows by "Number/序号"
 * - For each group, creates an object:
 *   { number: 1, cn: {...}, bilingual: {...}, en: {...} }
 *
 * Expected Notion property names (we try multiple keys to be robust):
 * - title: "书名" or "Title"
 * - number: "序号" or "Number"
 * - link: "内容链接" or "Link"
 * - status/lang: "状态" or "Status" or "Language"
 *
 * Environment variables required:
 * - NOTION_API_KEY
 * - NOTION_EBOOK_DATABASE_ID
 */

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DB_ID = process.env.NOTION_EBOOK_DATABASE_ID;

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

function safeProp(page, possibleKeys) {
  for (const k of possibleKeys) {
    if (page.properties?.[k]) return page.properties[k];
  }
  return undefined;
}

export default async function handler(req, res) {
  if (!process.env.NOTION_API_KEY || !process.env.NOTION_EBOOK_DATABASE_ID) {
    return res.status(500).json({ error: "Missing NOTION_API_KEY or NOTION_EBOOK_DATABASE_ID" });
  }

  try {
    // fetch all rows
    const pages = await fetchAllPages(DB_ID);

    // build map grouped by number
    const map = {};

    pages.forEach((page) => {
      // detect properties flexibly
      const titleProp = safeProp(page, ["书名", "Title", "title"]);
      const numberProp = safeProp(page, ["序号", "Number", "number"]);
      const linkProp = safeProp(page, ["内容链接", "Link", "link", "URL"]);
      const statusProp = safeProp(page, ["状态", "Status", "Language", "language"]);

      // parse number
      let number = numberProp?.number ?? null;
      if (number === null || number === undefined) {
        // try to parse number from a select or title fallback (rare)
        // if can't parse, skip
        return;
      }

      // parse language key string
      let langKey = null;
      if (statusProp?.select?.name) {
        langKey = statusProp.select.name.toLowerCase();
      } else if (statusProp?.name) {
        langKey = statusProp.name.toLowerCase();
      } else if (statusProp?.rich_text && statusProp.rich_text[0]) {
        langKey = (statusProp.rich_text[0].plain_text || "").toLowerCase();
      }

      // normalize possible synonyms
      if (langKey === "cn" || langKey === "zh" || langKey === "中文") langKey = "cn";
      if (langKey === "bilingual" || langKey === "双语" || langKey === "both") langKey = "bilingual";
      if (langKey === "en" || langKey === "english" || langKey === "英文") langKey = "en";

      if (!langKey) {
        // no language specified — skip this row
        return;
      }

      // parse title text
      let title = "";
      if (titleProp?.title && titleProp.title[0]) title = titleProp.title[0].plain_text;
      else if (titleProp?.rich_text && titleProp.rich_text[0]) title = titleProp.rich_text[0].plain_text;
      else if (titleProp?.plain_text) title = titleProp.plain_text || "";

      // parse description if available (optional)
      const descProp = safeProp(page, ["Description", "描述", "说明"]);
      let description = "";
      if (descProp?.rich_text && descProp.rich_text[0]) description = descProp.rich_text[0].plain_text;

      // parse link
      let link = "#";
      if (linkProp?.url) link = linkProp.url;
      else if (linkProp?.rich_text && linkProp.rich_text[0]) link = linkProp.rich_text[0].plain_text || "#";

      // ensure map entry
      if (!map[number]) map[number] = { number };

      map[number][langKey] = { title, description, link };
    });

    const books = Object.values(map).sort((a, b) => a.number - b.number);

    res.status(200).json(books);
  } catch (err) {
    console.error("Notion API error:", err);
    res.status(500).json({ error: "Notion fetch failed", details: err.message });
  }
}
