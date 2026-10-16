import Navbar from "../components/Navbar";
import Head from "next/head";
import { useState } from "react";

export const metadata = {
  title: "联系我们 — Weacond",
  robots: { index: false },
};

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // MVP: 仅前端验证，实际接入 Supabase / 邮件服务
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>联系我们 — Weacond</title></Head>
      <Navbar />
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">联系我们</h1>
          <p className="text-slate-600 mb-8">
            客服目标：VIP 首次响应 ≤5 分钟，普通用户 ≤2 小时，退款 ≤24 小时。
          </p>

          {sent ? (
            <div className="bg-green-50 text-green-700 p-6 rounded-xl border border-green-200 text-center">
              ✓ 消息已发送，我们会尽快回复。
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">姓名</label>
                  <input required className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">邮箱</label>
                  <input type="email" required className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">问题类型</label>
                <select className="w-full px-4 py-2.5 border rounded-lg text-sm">
                  <option>产品问题</option>
                  <option>支付/账单</option>
                  <option>数据错误</option>
                  <option>Bug 报告</option>
                  <option>合作/企业</option>
                  <option>其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">消息</label>
                <textarea required rows={4} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm resize-none" />
              </div>
              <button type="submit"
                className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-500 transition-colors">
                发送消息
              </button>
            </form>
          )}

          <div className="mt-8 text-center text-sm text-slate-500">
            <p>邮件：weacond@gmail.com</p>
            <p className="mt-2">
              紧急问题或企业咨询请直接邮件联系。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}