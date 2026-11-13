"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import StructuredData from "../components/StructuredData";
import { softwareLd } from "../lib/jsonLd";
import { buildDailyDigest, formatDigestText } from "../lib/digest.js";
import { buildDigestEmail } from "../lib/email.js";

export default function DigestPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [copied, setCopied] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [subEmail, setSubEmail] = useState("");
  const [subStatus, setSubStatus] = useState(null); // null | { ok, msg }

  const d = useMemo(
    () => buildDailyDigest({ date: today(), generatedAt: new Date().toISOString() }),
    []
  );
  const email = useMemo(() => buildDigestEmail(d, { lang }), [d, lang]);

  const copyText = () => {
    const txt = formatDigestText(d, lang);
    if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // 订阅每日简报：调用 /api/send-digest（配 key 才真发，否则返回预览，graceful）
  const subscribe = async (e) => {
    e.preventDefault();
    const to = subEmail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      setSubStatus({ ok: false, msg: L.invalidEmail });
      return;
    }
    setSubStatus(null);
    try {
      const r = await fetch("/api/send-digest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to, template: "digest", lang }),
      });
      const j = await r.json();
      setSubStatus({
        ok: !!j.ok,
        msg:
          j.ok && j.delivery && j.delivery.sent
            ? L.subSent
            : j.ok
            ? L.subPreview
            : L.subError,
      });
      if (j.ok) setSubEmail("");
    } catch (_err) {
      setSubStatus({ ok: false, msg: L.subError });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title} — Weacond</title>
        <meta name="description" content={L.subtitle} />
      </Head>
      <StructuredData
        data={[
          softwareLd({
            id: "digest",
            icon: "📰",
            title: "每日信号简报",
            titleEn: "Daily Signal Brief",
            desc: "按盈利概率排序的今日信号 + 波动焦点 + 风险预警。",
            descEn: "Today's signals ranked by win probability, with volatility focus and risk warning.",
            href: "/digest",
            category: "market",
          }),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">{d.headline}</h1>
            <button
              onClick={copyText}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100"
            >
              {copied ? "✓ " + L.copied : L.copy}
            </button>
            <button
              onClick={() => setShowEmail(!showEmail)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 ml-2"
            >
              {showEmail ? "✕ " + L.hideEmail : L.previewEmail}
            </button>
          </div>
          <p className="text-slate-500 mb-1">{L.subtitle}</p>
          <p className="text-xs text-slate-400 mb-6">
            {L.date} · {d.date} · {L.dataMode} {d.dataMode}
          </p>

          <p className="text-sm text-slate-600 mb-3 font-medium">{L.topSignals}</p>
          <div className="space-y-2">
            {d.top.map((s, i) => (
              <div key={s.ticker} className="bg-white rounded-xl p-4 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {i + 1}. {s.ticker}
                  </span>
                  <span className="text-green-600 font-mono text-sm">
                    P(+)≈{Math.round(s.probOfProfit * 100)}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {L.probability} {s.assumptions.probability}
                </p>
              </div>
            ))}
          </div>

          {showEmail && (
            <div className="mt-6 rounded-xl p-4 border border-slate-200 bg-white">
              <div className="text-xs text-slate-400 mb-1">{L.emailSubject}</div>
              <div className="text-sm font-semibold mb-2">{email.subject}</div>
              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans max-h-64 overflow-auto bg-slate-50 rounded p-3">
                {email.text}
              </pre>
              <p className="text-xs text-slate-400 mt-2">{L.emailHint}</p>
            </div>
          )}

          {d.riskOfTheDay && (
            <div className="mt-6 rounded-xl p-4 border border-amber-200 bg-amber-50">
              <div className="font-semibold mb-1">⚠️ {L.riskOfDay}</div>
              <p className="text-sm text-slate-600">
                {d.riskOfTheDay.ticker} · IV Rank {d.riskOfTheDay.ivRank} · {d.riskOfTheDay.riskLevel}
              </p>
            </div>
          )}

          <p className="text-xs text-slate-400 mt-6 leading-relaxed">{d.disclaimer}</p>
          <Link href="/signals" className="text-sm text-indigo-600 hover:underline mt-4 inline-block">
            {L.cta}
          </Link>

          <div className="mt-8 rounded-xl p-5 border border-indigo-100 bg-indigo-50/40">
            <h3 className="font-semibold mb-1">{L.subscribeTitle}</h3>
            <p className="text-xs text-slate-500 mb-3">{L.subscribeDesc}</p>
            <form onSubmit={subscribe} className="flex gap-2">
              <input
                type="email"
                value={subEmail}
                onChange={(e) => setSubEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="email"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                {L.subscribeBtn}
              </button>
            </form>
            {subStatus && (
              <p
                className={
                  "text-xs mt-2 " + (subStatus.ok ? "text-emerald-600" : "text-rose-600")
                }
              >
                {subStatus.msg}
              </p>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const zh = {
  title: "每日信号简报",
  subtitle: "按盈利概率排序的今日信号 + 波动焦点 + 风险预警，可一键复制为邮件/通知。",
  copy: "复制为文本",
  copied: "已复制",
  date: "日期",
  dataMode: "数据模式",
  topSignals: "今日最高盈利概率 Top 3",
  probability: "概率区间",
  riskOfDay: "今日波动焦点",
  cta: "查看完整信号与假设 →",
  previewEmail: "邮件预览",
  hideEmail: "隐藏",
  emailSubject: "邮件主题",
  emailHint: "配 EMAIL_SEND_URL/EMAIL_SEND_TOKEN 后即可一键发送；当前为预览。",
  subscribeTitle: "订阅每日简报",
  subscribeDesc: "每个交易日收盘后，把今日信号 + 风险预警发到你的邮箱。",
  subscribeBtn: "订阅",
  invalidEmail: "请输入有效的邮箱地址",
  subSent: "✓ 已发送，请查收邮箱。",
  subPreview: "✓ 已生成预览（尚未配置发送服务）。",
  subError: "发送失败，请稍后再试。",
};
const en = {
  title: "Daily Signal Brief",
  subtitle:
    "Today's signals ranked by win probability, the volatility focus, and a risk warning — copy as an email/notification in one click.",
  copy: "Copy as text",
  copied: "Copied",
  date: "Date",
  dataMode: "Data mode",
  topSignals: "Top 3 win-probability signals today",
  probability: "Probability",
  riskOfDay: "Volatility focus",
  cta: "See full signals & assumptions →",
  previewEmail: "Email preview",
  hideEmail: "Hide",
  emailSubject: "Subject",
  emailHint: "Set EMAIL_SEND_URL / EMAIL_SEND_TOKEN to enable one-click send; currently a preview.",
  subscribeTitle: "Subscribe to the daily brief",
  subscribeDesc: "Each trading day after close, we'll email today's signals and risk warning.",
  subscribeBtn: "Subscribe",
  invalidEmail: "Please enter a valid email address",
  subSent: "✓ Sent — check your inbox.",
  subPreview: "✓ Preview generated (no send service configured yet).",
  subError: "Send failed, please try again.",
};

