import { Client } from "@notionhq/client";

export const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export async function getBooks(language: string) {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_BOOKS_DB_ID,
    filter: {
      property: "Language",
      select: { equals: language },
    },
    sorts: [{ property: "Title", direction: "ascending" }],
  });

  return response.results.map((book) => ({
    id: book.id,
    title: book.properties.Title.title[0]?.plain_text || "",
    cover: book.properties.Cover.files[0]?.file.url || "",
  }));
}
