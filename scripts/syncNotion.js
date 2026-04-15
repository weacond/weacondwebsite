const { Client } = require("@notionhq/client");
const fs = require("fs");

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const database_id = process.env.NOTION_EBOOK_DATABASE_ID;

async function fetchAllPages() {
  let results = [];
  let cursor = undefined;

  while (true) {
    const res = await notion.databases.query({
      database_id,
      start_cursor: cursor,
      page_size: 100,
    });

    results.push(...res.results);

    if (!res.has_more) break;
    cursor = res.next_cursor;
  }

  return results;
}

function getText(prop) {
  if (!prop) return "";
  if (prop.title && prop.title[0]) return prop.title[0].plain_text;
  if (prop.rich_text && prop.rich_text[0]) return prop.rich_text[0].plain_text;
  return "";
}

async function main() {
  const pages = await fetchAllPages();

  const books = pages.map((page) => {
    const props = page.properties;

    return {
      number: props["序号"]?.number || 0,

      cn: {
        title: getText(props["书名"]),
        description: getText(props["描述"]),
        content: getText(props["内容"]),
      },

      en: {
        title: getText(props["English Title"]),
        description: getText(props["English Description"]),
        content: getText(props["English Content"]),
      },
    };
  });

  fs.writeFileSync(
    "data/ebooks.json",
    JSON.stringify(books, null, 2)
  );

  console.log("✅ ebooks.json updated!");
}

main();
