/**
 * lib/putseller.js — 卖 Put 筛选器（PutSeller 产品核心）
 *
 * 把已测试的期权原语（lib/options.js：priceOption / probITM / ivRank）与
 * 已定义的筛选规则（lib/signals.js：screenPutSignals）组合成一个可用的筛选流程，
 * 让 screenPutSignals 从「死代码」变成被调用的真功能。
 *
 * 诚实定位：这是 **B-S 模型估算**，非实时交易所报价（免费数据源无可靠逐档期权链，
 * 与 lib/options.js 的定位一致）。纯函数、确定性、无网络——可单元测试。
 *
 * 筛选口径（沿用 screenPutSignals）：IV Rank > 50（卖方有 Theta 优势）且
 * 基本面评分 > 60（被低估/质地好）→ 卖虚值 Put。
 */

import { priceOption, probITM, ivRank } from "./options.js";
import { screenPutSignals } from "./signals.js";

/**
 * 默认标的池：现货 / 隐含波动率 / IV Rank / 基本面评分（0-100）。
 * 设计为「部分通过、部分被过滤」，既能产出结果，也演示筛选逻辑。
 * 数据为模型示意值（非实时），接入行情/期权链后只需替换本数组。
 */
export const DEFAULT_PUT_UNIVERSE = [
  { ticker: "NVDA", name: "NVIDIA", spot: 130, iv: 0.45, ivRank: 78, fundamentalScore: 82 },
  { ticker: "MSFT", name: "Microsoft", spot: 420, iv: 0.22, ivRank: 55, fundamentalScore: 78 },
  { ticker: "QQQ", name: "纳斯达克100 ETF", spot: 400, iv: 0.16, ivRank: 52, fundamentalScore: 70 },
  { ticker: "BABA", name: "阿里巴巴", spot: 80, iv: 0.35, ivRank: 65, fundamentalScore: 68 },
  { ticker: "SPY", name: "S&P 500 ETF", spot: 510, iv: 0.15, ivRank: 40, fundamentalScore: 72 },
  { ticker: "AAPL", name: "Apple", spot: 190, iv: 0.28, ivRank: 45, fundamentalScore: 65 },
  { ticker: "TSLA", name: "Tesla", spot: 250, iv: 0.6, ivRank: 82, fundamentalScore: 40 },
  { ticker: "AMD", name: "AMD", spot: 170, iv: 0.5, ivRank: 70, fundamentalScore: 55 },
];

/**
 * 生成卖 Put 筛选结果。
 * @param {Array<{ticker:string,name?:string,spot:number,iv?:number,ivRank?:number,fundamentalScore?:number,ivHistory?:number[]}>} universe
 * @param {Object} [opts]
 * @param {number} [opts.expiryDays=30] 距到期天数（→ t 年数）
 * @param {number} [opts.otmPct=0.1] 虚值幅度（strike = spot×(1−otmPct)）
 * @param {number} [opts.r=0.04] 无风险利率
 * @returns {Array} 通过筛选的标的，按综合分降序；每项含
 *   { ticker, name, spot, strike, expiryDays, ivRank, premium, score(0-100),
 *     direction, riskLevel, probITM, theta, delta, rationale }
 */
export function buildPutScreener(
  universe = DEFAULT_PUT_UNIVERSE,
  { expiryDays = 30, otmPct = 0.1, r = 0.04 } = {}
) {
  const t = expiryDays / 365;
  const byTicker = {};
  const marketData = {};

  for (const u of universe) {
    const spot = Number(u.spot);
    const iv = Number(u.iv ?? 0.25);
    // ivRank：优先用给定值（0-100）；未给则用 ivRank(current, history) 计算
    const rank = u.ivRank != null ? Number(u.ivRank) : ivRank(iv, u.ivHistory || []);
    const fundamentalScore = Number(u.fundamentalScore ?? 50);
    const strike = Math.max(0.01, +(spot * (1 - otmPct)).toFixed(2));
    const put = priceOption("put", spot, strike, { r, t, iv });
    const prob = probITM("put", spot, strike, { r, t, iv });

    marketData[u.ticker] = {
      ivRank: rank,
      fundamentalScore,
      suggestedStrike: strike,
      suggestedExpiry: expiryDays,
      premium: put.price,
    };
    byTicker[u.ticker] = {
      name: u.name,
      spot,
      iv,
      ivRank: rank,
      probITM: prob,
      put,
    };
  }

  const screened = screenPutSignals(
    universe.map((u) => u.ticker),
    marketData
  );

  return screened.map((row) => {
    const info = byTicker[row.ticker] || {};
    return {
      ticker: row.ticker,
      name: info.name || row.ticker,
      spot: info.spot,
      strike: row.strike,
      expiryDays: row.expiry,
      ivRank: row.ivRank,
      premium: row.premium,
      score: row.score.score, // 0-100
      direction: row.score.direction,
      riskLevel: row.score.riskLevel,
      probITM: info.probITM ?? null,
      theta: info.put ? info.put.theta : null,
      delta: info.put ? info.put.delta : null,
      rationale: row.rationale,
    };
  });
}
