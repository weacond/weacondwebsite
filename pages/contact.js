import Navbar from "../components/Navbar";
import Head from "next/head";
import { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";

export const metadata = {
  title: "联系我们 — Weacond",
  robots: { index: false },
};

const zh = {
  title: "联系我们",
  lead: "客服目标：VIP 首次响应 ≤5 分钟，普通用户 ≤2 小时，退款 ≤24 小时。",
  sent: "✓ 消息已发送，我们会尽快回复。",
  name: "姓名", email: "邮箱", topic: "问题类型", message: "消息", submit: "发送消息",
  topics: ["产品问题", "支付/账单", "数据错误", "Bug 报告", "合作/企业", "其他"],
  emailHint: "邮件：weacond@gmail.com",
  urgentHint: "紧急问题或企业咨询请直接邮件联系。",
};
const en = {
  title: "Contact Us",
  lead: "SLA: VIP first response ≤5 min, standard users ≤2 h, refunds ≤24 h.",
  sent: "✓ Message sent — we'll get back to you soon.",
  name: "Name", email: "Email", topic: "Topic", message: "Message", submit: "Send message",
  topics: ["Product issue", "Payment / Billing", "Data error", "Bug report", "Partnership / Enterprise", "Other"],
  emailHint: "Email: weacond@gmail.com",
  urgentHint: "For urgent or enterprise inquiries, please email us directly.",
};

export default function ContactPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // MVP: 仅前端验证，实际接入 Supabase / 邮件服务
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title} — Weacond</title></Head>
      <Navbar />
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">{L.title}</h1>
          <p className="text-slate-600 mb-8">
            {L.lead}
          </p>

          {sent ? (
            <div className="bg-green-50 text-green-700 p-6 rounded-xl border border-green-200 text-center">
              {L.sent}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{L.name}</label>
                  <input required className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{L.email}</label>
                  <input type="email" required className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{L.topic}</label>
                <select className="w-full px-4 py-2.5 border rounded-lg text-sm">
                  {L.topics.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{L.message}</label>
                <textarea required rows={4} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm resize-none" />
              </div>
              <button type="submit"
                className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-500 transition-colors">
                {L.submit}
              </button>
            </form>
          )}

          <div className="mt-8 text-center text-sm text-slate-500">
            <p>{L.emailHint}</p>
            <p className="mt-2">
              {L.urgentHint}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}