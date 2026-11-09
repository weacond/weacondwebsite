// lib/fundamentals.js — 基本面数据展示助手（纯函数，无副作用，可单测）
// 从 /api/marketdata 的 fundamentals 对象中挑选并格式化关键字段。
// 设计原则：null / 缺失一律显式返回占位符 "—"，绝不捏造数值。

/**
 * 将基本面对象格式化为一组可展示的「标签: 值」条目。
 * @param {Object} fund - fetchFundamentals 的返回，形如
 *   { symbol, name, sector, peRatio, pbRatio, roe, marketCap, dividendYield, beta, live, source }
 * @param {string} [lang] - "zh" | "en"
 * @returns {Object|null} { symbol, name, sector, live, source, items: [{label, value}] }
 *   fund 非对象时返回 null（调用方据此隐藏组件）。
 */
export function summarizeFundamentals(fund, lang = "zh") {
  if (!fund || typeof fund !== "object") return null;
  const isEn = lang === "en";

  const ratio = (v) => (v == null || Number.isNaN(v) ? "—" : Number(v).toFixed(2));
  const pct = (v) => (v == null || Number.isNaN(v) ? "—" : `${(Number(v) * 100).toFixed(1)}%`);
  const cap = (v) => {
    if (v == null || Number.isNaN(v)) return "—";
    const n = Number(v);
    if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    return `$${n.toLocaleString()}`;
  };

  return {
    symbol: fund.symbol || "—",
    name: fund.name || "—",
    sector: fund.sector || "—",
    live: Boolean(fund.live),
    source: fund.source || "mock",
    items: [
      { label: isEn ? "P/E" : "市盈率", value: ratio(fund.peRatio) },
      { label: isEn ? "P/B" : "市净率", value: ratio(fund.pbRatio) },
      { label: "ROE", value: pct(fund.roe) },
      { label: isEn ? "Mkt Cap" : "市值", value: cap(fund.marketCap) },
      { label: isEn ? "Div Yield" : "股息率", value: pct(fund.dividendYield) },
    ],
  };
}
