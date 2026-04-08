import { useRouter } from "next/router";

export default function EbookPage() {
  const router = useRouter();
  const { slug } = router.query;

  return (
    <div style={{ padding: "20px" }}>
      <h1>电子书页面</h1>

      <p>当前书ID: {slug}</p>

      <p>这里以后放你的书内容（PDF / 文本）</p>
    </div>
  );
}
