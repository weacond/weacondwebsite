// tests/winProbability.test.mjs — 「卖确定性的概率」引擎单元测试
// 用 node --experimental-vm-modules 直接 import（lib/winProbability.js 无浏览器依赖）。
import assert from "node:assert/strict";
import {
  normalCdf,
  winProbability,
  winVerdict,
  rankByWinProbability,
  edgeToMuPer,
} from "../lib/winProbability.js";

function approx(a, b, eps = 1e-4, msg) {
  assert.ok(
    Math.abs(a - b) <= eps,
    `${msg || "approx"}: ${a} ≈ ${b} (±${eps})`
  );
}

let passed = 0;
function t(name, fn) {
  fn();
  passed++;
  console.log("  ✓ " + name);
}

// ── normalCdf ──
t("normalCdf(0) ≈ 0.5", () => approx(normalCdf(0), 0.5, 1e-6));
t("normalCdf 对称：CDF(x)+CDF(-x)=1", () =>
  approx(normalCdf(1) + normalCdf(-1), 1, 1e-6));
t("normalCdf(1.96) ≈ 0.975", () => approx(normalCdf(1.96), 0.975, 5e-3));
t("normalCdf(∞)→1, (−∞)→0", () => {
  assert.equal(normalCdf(Infinity), 1);
  assert.equal(normalCdf(-Infinity), 0);
});

// ── winProbability 基线 ──
t("中性评分(0.5)+零成本 → 胜率 0.5", () => {
  const r = winProbability({ score: 0.5, breakeven: 0 });
  approx(r.probOfProfit, 0.5, 1e-6);
});
t("评分单调：越高分越高胜率", () => {
  const lo = winProbability({ score: 0.4, breakeven: 0 }).probOfProfit;
  const hi = winProbability({ score: 0.8, breakeven: 0 }).probOfProfit;
  assert.ok(hi > lo, `hi=${hi} > lo=${lo}`);
});
t("高评分(0.9)+零成本 → 高胜率 (>0.6)", () => {
  const r = winProbability({ score: 0.9, breakeven: 0 });
  assert.ok(r.probOfProfit > 0.6, `prob=${r.probOfProfit}`);
  assert.equal(r.highWin, true);
});
t("正成本(breakeven>0) 降低胜率", () => {
  const noCost = winProbability({ score: 0.7, breakeven: 0 }).probOfProfit;
  const withCost = winProbability({ score: 0.7, breakeven: 0.03 }).probOfProfit;
  assert.ok(withCost < noCost, `withCost=${withCost} < noCost=${noCost}`);
});
t("零波动 → 退化为 0.5（无法给概率）", () => {
  approx(winProbability({ score: 0.9, sigmaPer: 0 }).probOfProfit, 0.5, 1e-9);
});
t("期数越多，正成本被稀释：胜率上升（μ 累积 > 成本）", () => {
  const short = winProbability({ score: 0.75, breakeven: 0.05, horizon: 5 }).probOfProfit;
  const long = winProbability({ score: 0.75, breakeven: 0.05, horizon: 120 }).probOfProfit;
  assert.ok(long > short, `long=${long} > short=${short}`);
});

// ── 置信区间 + 假设 ──
t("置信区间在 [0,1] 且 下界 ≤ 上界", () => {
  const { confidenceBand: [lo, hi] } = winProbability({ score: 0.7 });
  assert.ok(lo >= 0 && hi <= 1 && lo <= hi, `[${lo},${hi}]`);
});
t("始终附假设清单 + 肥尾警示（反幻觉）", () => {
  const r = winProbability({ score: 0.6 });
  assert.ok(Array.isArray(r.assumptions) && r.assumptions.length >= 5);
  assert.equal(r.fatTailWarning, true);
  assert.ok(r.assumptions.some((s) => /肥尾|fat/i.test(s)), "含肥尾警示");
  assert.ok(r.assumptions.some((s) => /非投资建议|教育/i.test(s)), "含免责声明");
});

// ── 分级 + 排序 ──
t("winVerdict 分级：高/中/低/未知", () => {
  assert.equal(winVerdict(0.7), "high");
  assert.equal(winVerdict(0.5), "mid");
  assert.equal(winVerdict(0.3), "low");
  assert.equal(winVerdict(NaN), "unknown");
});
t("rankByWinProbability 按胜率降序 + 标记 highWin", () => {
  const ranked = rankByWinProbability([
    { id: "A", score: 0.4 },
    { id: "B", score: 0.9, breakeven: 0 },
    { id: "C", score: 0.6 },
  ]);
  assert.equal(ranked[0].id, "B");
  assert.ok(ranked[0].probOfProfit >= ranked[2].probOfProfit);
  assert.equal(ranked[0].highWin, true);
});
t("rankByWinProbability 空/非法输入 → []", () => {
  assert.deepEqual(rankByWinProbability(null), []);
  assert.deepEqual(rankByWinProbability([]), []);
});

// ── edgeToMuPer ──
t("edgeToMuPer：中性评分→0，正 gain 放大", () => {
  approx(edgeToMuPer(0.5, 0.05), 0, 1e-9);
  assert.ok(edgeToMuPer(0.8, 0.05) > 0);
  assert.ok(edgeToMuPer(0.2, 0.05) < 0);
});

console.log(`\n✅ winProbability: ${passed}/${passed} 通过`);
