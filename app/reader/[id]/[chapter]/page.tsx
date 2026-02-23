export default function ReaderPage({ params }: any) {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">
        阅读页面
      </h1>

      <p className="leading-relaxed text-neutral-700">
        这里是章节内容。
        后续可以接入 Markdown 文件。
      </p>
    </div>
  );
}
