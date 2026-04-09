import { useRouter } from "next/router";
import ebooks from "../../data/ebooks.json";

export default function EbookPage() {
  const router = useRouter();
  const { slug } = router.query;

  if (!slug) return <p>加载中...</p>;

  // 在 JSON 里找对应的书和语言
  let book = null;
  for (const b of ebooks) {
    book = b.lang.find(l => l.slug === slug);
    if (book) break;
  }

  if (!book) return <p>书不存在</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>{book.title}</h1>
      <p>{book.description}</p>
      {book.link && (
        <iframe
          src={book.link}
          width="100%"
          height="800px"
          style={{ border: "none", marginTop: "20px" }}
        />
      )}
    </div>
  );
}
