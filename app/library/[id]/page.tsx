import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function BookDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;

  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID!,
      filter: {
        property: "index", // Match your Notion column name
        number: { equals: parseInt(id) }
      }
    });

    const page = response.results[0];

    return (
      <div className="max-w-2xl mx-auto p-10">
        <h1 className="text-3xl font-bold mb-4">
          {/* @ts-ignore */}
          {page?.properties["BookName"]?.title[0]?.plain_text || "Loading..."}
        </h1>
        <div className="text-gray-600">
          <p>Connected to Notion successfully.</p>
        </div>
      </div>
    );
  } catch (error) {
    return <div className="p-10 text-red-500">Error: Check Environment Variables.</div>;
  }
}
