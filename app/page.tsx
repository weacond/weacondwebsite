export default function HomePage() {
  return (
    <div className="max-w-3xl space-y-12">
      
      <h1 className="text-3xl font-semibold">
        Financial Knowledge System
      </h1>

      <p className="text-neutral-600 leading-relaxed">
        我们通过系统化方式整理金融认知结构，
        让复杂知识变得清晰、可学习、可沉淀。
      </p>

      <p className="text-neutral-600 leading-relaxed">
        本平台提供多语言金融书籍内容，
        支持持续更新与长期积累。
      </p>

      <div>
        <button className="border border-neutral-900 px-6 py-2 text-sm hover:bg-neutral-900 hover:text-white transition">
          我的业务
        </button>
      </div>

    </div>
  );
}
