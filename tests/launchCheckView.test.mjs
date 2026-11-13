// tests/launchCheckView.test.mjs
// 上线就绪清单的纯渲染函数：i18n + 进度 + 分组。
import { formatReport, progressSegments } from "../lib/launchCheckView.js";

function makeReport(over = {}) {
  return {
    ready: false,
    summary: { total: 11, configured: 4, missing: 7, blockersMissing: 3, recommendedMissing: 1, optionalMissing: 2 },
    todo: [
      { what: "Stripe Webhook 签名密钥", where: "Stripe 后台", hint: "whsec_...", severity: "blocker" },
      { what: "Alpha Vantage 实时行情", where: "GitHub Secrets", hint: "免费", severity: "blocker" },
      { what: "适用法律/注册主体", where: "lib/legalContent.js", hint: "新加坡", severity: "blocker" },
    ],
    recommended: [{ what: "FRED 宏观", where: "GitHub Secrets", hint: "可选", severity: "recommended" }],
    optional: [{ what: "OpenAI", where: "GitHub Secrets", hint: "", severity: "optional" }],
    ...over,
  };
}

// 1) 进度：configured/total
const v = formatReport(makeReport(), "zh");
console.assert(v.progressPct === Math.round((4 / 11) * 100), "progressPct");
console.assert(v.progressPct === 36, "4/11 => 36%");
console.assert(v.configured === 4 && v.total === 11, "configured/total");

// 2) 未完成：statusLabel 把 %N% 替换为 todo 数量(3)
console.assert(!v.ready, "not ready");
console.assert(/还有 3 项/.test(v.statusLabel), "notReady label shows 3: " + v.statusLabel);
console.assert(!v.statusLabel.includes("%N%"), "no leftover %N%");

// 3) 分组：todo 3 项、recommended 1、optional 1
console.assert(v.groups[0].items.length === 3, "todo group has 3");
console.assert(v.groups[0].title === "上线前必做（Blocker）", "zh todo title");
console.assert(v.groups[1].items.length === 1, "recommended group");
console.assert(v.groups[2].items.length === 1, "optional group");

// 4) 已就绪：ready true → statusLabel 为「可上线」，%N% 不出现
const vReady = formatReport(makeReport({ ready: true, todo: [] }), "zh");
console.assert(vReady.ready === true, "ready true");
console.assert(/可上线/.test(vReady.statusLabel), "ready label");

// 5) i18n：en 标题
const ve = formatReport(makeReport(), "en");
console.assert(ve.title === "Launch Readiness", "en title");
console.assert(ve.groups[0].title === "Must-do before launch (Blockers)", "en todo title");
console.assert(/3 item/.test(ve.statusLabel), "en notReady: " + ve.statusLabel);

// 6) 未知 lang 回退 zh
const vxx = formatReport(makeReport(), "xx");
console.assert(vxx.title === "上线就绪清单", "unknown lang falls back to zh");

// 7) 进度分段
const seg = progressSegments(makeReport());
console.assert(seg.donePct === 36 && seg.pendingPct === 64, "segments 36/64");
console.assert(progressSegments({}).donePct === 0, "empty report => 0%");

// 8) 空 report 不崩
const vEmpty = formatReport({}, "zh");
console.assert(vEmpty.total === 0 && vEmpty.progressPct === 0, "empty report safe");
console.assert(vEmpty.groups[0].items.length === 0, "empty todo group");

console.log("ALL PASS");
