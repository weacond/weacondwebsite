import { useRouter } from "next/router";
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((r) => r.json());

export default function EbookPage() {
  const router = useRouter();
  const { slug } = router.query;

  const { data, isLoading } = useSWR("/api/ebooks", fetcher);

  if (!slug || isLoading) return <p>Loading...</p>;

  let bookData = null;

  for (const book of data) {
    if (slug.startsWith(book.number)) {
      const lang = slug.split("-")[1];
      bookData = book[lang];
      break;
    }
  }

  if (!bookData) return <p>Book not found</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>{bookData.title}</h1>
      <p>{bookData.description}</p>

      {/* 如果你有 Notion / PDF 链接 */}
      {bookData.link && bookData.link !== "#" && (
        <iframe
          src={bookData.link}
          width="100%"
          height="800px"
          style={{ border: "none", marginTop: "20px" }}
        />
      )}
    </div>
  );
}
