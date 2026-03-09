import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export async function getDatabaseItems(databaseId: string) {
  const response = await notion.databases.query({ database_id: databaseId });
  return response.results;
}

export async function getPageContent(pageId: string) {
  const blocks = await notion.blocks.children.list({ block_id: pageId });
  return blocks.results;
}
