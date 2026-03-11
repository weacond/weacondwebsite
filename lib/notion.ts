import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export async function getBooksDatabase(databaseId: string) {
  const response = await notion.databases.query({ database_id: databaseId });
  return response.results;
}

export async function getBookPage(pageId: string) {
  return await notion.pages.retrieve({ page_id: pageId });
}
