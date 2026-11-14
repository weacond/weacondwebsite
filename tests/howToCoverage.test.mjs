// tests/howToCoverage.test.mjs — HowTo + BreadcrumbList JSON-LD 覆盖守卫（防回归）
//
// 与 seoCoverage.test.mjs 同构：基于页面源码文本检查，锁定「旗舰计算器页已铺开
// HowTo + BreadcrumbList 结构化数据」的成果，防未来某页漏注入导致 SEO 回退。
// 已铺开页 = 既有 4 个旗舰页 + 利率/FX 6 个（loan / ear / bond / fx-pip / fx-cross / interest-parity）
//   + 仓位/风险 6 个（position-size / risk / margin / leverage / lot-size / kelly）
//   + 估值/收益 6 个（npv / xirr / twrr / compound / annuity / ytm）
//   + 绩效/概率 6 个（expectancy / winrate / r-multiple / prob-return / real-return / real-after-tax）
//   + 交易管理 6 个（atr-stop / trailing-stop / two-barrier / take-profit / breakeven / average-entry）
//   + 组合/风险 6 个（portfolio / portfolio-beta / correlation / rebalance / voltarget / vol-drag）
//   + 期权 5 个（options / options-payoff / hedge / fair-value / putseller，putseller 用 meta.zh/en + t 结构，已适配）
//   + 成本/税 5 个（slippage / tax-drag / tax-loss / funding / continuous）。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, "..", "pages");

// 已铺开 HowTo + BreadcrumbList 的计算器页（顺序即回归清单）。
const COVERED = [
  "drawdown", "drawdown-sizing", "risk-ruin", "risk-budget",
  "loan", "ear", "bond", "fx-pip", "fx-cross", "interest-parity",
  "position-size", "risk", "margin", "leverage", "lot-size", "kelly",
  "npv", "xirr", "twrr", "compound", "annuity", "ytm",
  "expectancy", "winrate", "r-multiple", "prob-return", "real-return", "real-after-tax",
  "atr-stop", "trailing-stop", "two-barrier", "take-profit", "breakeven", "average-entry",
  "portfolio", "portfolio-beta", "correlation", "rebalance", "voltarget", "vol-drag",
  "options", "options-payoff", "hedge", "fair-value", "putseller",
  "slippage", "tax-drag", "tax-loss", "funding", "continuous",
];

// 三处都齐才算“已铺开”：HowTo JSON-LD 注入、BreadcrumbList 注入、且面包屑首项为 Home；
// 另查 locale 里的 howTo 步骤数组存在（防空注入：howToTitle/howTo 缺失会产空 HowTo）。
function pageHasHowToAndBreadcrumb(slug) {
  const body = fs.readFileSync(path.join(pagesDir, slug + ".js"), "utf8");
  return (
    body.includes("howToLd(") &&
    body.includes("breadcrumbLd(") &&
    body.includes('breadcrumbLd([{ name: "Home", href: "/" }') &&
    body.includes("howTo:")
  );
}

test("已铺开页均含 HowTo + BreadcrumbList JSON-LD", () => {
  const missing = [];
  for (const slug of COVERED) {
    if (!fs.existsSync(path.join(pagesDir, slug + ".js"))) {
      missing.push(`${slug}(noFile)`);
      continue;
    }
    if (!pageHasHowToAndBreadcrumb(slug)) missing.push(`${slug}(noHowTo/Breadcrumb)`);
  }
  assert.deepEqual(missing, [], `以下页面缺少 HowTo/Breadcrumb: ${missing.join(", ")}`);
});

test("覆盖清单非空且互不重复", () => {
  assert.ok(COVERED.length >= 6, "覆盖清单应至少含本批新增 6 页");
  assert.equal(new Set(COVERED).size, COVERED.length, "覆盖清单不应有重复");
});
