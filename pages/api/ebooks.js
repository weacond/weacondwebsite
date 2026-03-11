import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export default async function handler(req, res) {
  const { lang } = req.query;

  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DB_ID,
      filter: {
        property: 'Language',
        select: { equals: lang }
      }
    });

    const books = response.results.map(page => ({
      id: page.id,
      title: page.properties.Name.title[0]?.plain_text || "No title",
      description: page.properties.Description.rich_text[0]?.plain_text || "",
      link: page.properties.Link.url || "#"
    }));

    res.status(200).json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}
