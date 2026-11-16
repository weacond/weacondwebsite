"use client";

// components/PlanCta.js — 定价页 CTA（客户端组件）
//   free      → 链接 /login（仅登录）
//   contact   → 链接 /contact（企业档联系报价，不发起支付）
//   paid      → 月/年切换 + 订阅按钮，接 Stripe 订阅（lib/subscribeClient.js）
// 订阅逻辑在 lib/subscribeClient.js，点击时惰性 import 以减小首屏体积（与 /ebooks 的 buyBook 一致）。

import { useState } from "react";

export default function PlanCta({ plan, lang = "zh", highlight = false }) {
  const [interval, setInterval] = useState("month");
  const type = plan.type || "paid";

  // 免费 / 企业：纯链接，绝不发起支付
  if (type === "free" || type === "contact") {
    const href = type === "free" ? "/login" : "/contact";
    return (
      <a
        href={href}
        className={`block text-center py-2.5 rounded-lg font-semibold text-sm transition-colors ${
          highlight
            ? "bg-white text-indigo-600 hover:bg-indigo-50"
            : "bg-indigo-600 text-white hover:bg-indigo-500"
        }`}
      >
        {plan.cta}
      </a>
    );
  }

  // 付费档：月/年切换 + 订阅按钮
  const monthLabel = lang === "en" ? "Monthly" : "月付";
  const yearLabel = lang === "en" ? "Yearly" : "年付";
  const activeCls = highlight ? "bg-indigo-600 text-white" : "bg-slate-800 text-white";
  const idleCls = highlight ? "bg-white/20 text-indigo-100" : "bg-white text-slate-600";
  const btnCls = highlight
    ? "bg-white text-indigo-600 hover:bg-indigo-50"
    : "bg-indigo-600 text-white hover:bg-indigo-500";
  const canYear = plan.price_year > 0;
  const yearSaving = canYear
    ? Math.round((1 - plan.price_year / (plan.price_month * 12)) * 100)
    : 0;

  return (
    <div className="space-y-2">
      {canYear && (
        <div
          className={`flex rounded-lg overflow-hidden text-xs ${
            highlight ? "" : "border border-slate-200"
          }`}
        >
          <button
            type="button"
            onClick={() => setInterval("month")}
            aria-pressed={interval === "month"}
            className={`flex-1 py-1.5 transition-colors ${
              interval === "month" ? activeCls : idleCls
            }`}
          >
            {monthLabel}
          </button>
          <button
            type="button"
            onClick={() => setInterval("year")}
            aria-pressed={interval === "year"}
            className={`flex-1 py-1.5 transition-colors ${
              interval === "year" ? activeCls : idleCls
            }`}
          >
            {yearLabel}（{lang === "en" ? "save " : "省"}{yearSaving}%）
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={async () => {
          const { subscribe } = await import("../lib/subscribeClient.js");
          subscribe(plan.key, interval, lang);
        }}
        className={`block w-full text-center py-2.5 rounded-lg font-semibold text-sm transition-colors ${btnCls}`}
      >
        {plan.cta}
      </button>
    </div>
  );
}
