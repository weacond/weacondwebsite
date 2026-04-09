import { useRouter } from "next/router";
import ebooks from "../../data/ebooks.json";

export default function EbookPage() {
  const router = useRouter();
  const { slug } = router.query;

  if (!slug) return <p>加载中...</p>;

  const book = ebooks.find(b => b.slug === slug);

  if (!book) return <p>书不存在</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>{book.title}</h1>
      <p>{book.description}</p>
      {/* 如果你有 PDF 文件，可以用 iframe 嵌入 */}
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
