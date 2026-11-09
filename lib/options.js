/**
 * lib/options.js — Black-Scholes-Merton 欧式期权定价 + 希腊字母
 *
 * 诚实定位：这是**解析模型估算**，非实时交易所期权报价。免费数据源（Alpha
 * Vantage 等）无可靠的逐档期权链，故用 B-S 模型生成确定性、可复现的期权链，
 * 用于 /options 页面的教学与示意。所有函数均为纯函数（无网络、无时间），可单元测试。
 *
 * 输入约定：
 *   spot  S  现价
 *   strike K 行权价
 *   r     无风险利率（年化，小数，如 0.04 = 4%）
 *   t     距到期年数（如 30 天 ≈ 30/365）
 *   iv    隐含波动率（小数，如 0.25 = 25%）
 *
 * 希腊字母口径：
 *   delta  ΔS=1 的价格变化
 *   gamma  Δdelta 对 ΔS
 *   theta  每日时间衰减（已 ÷365）
 *   vega   每 1% 波动率变化的价格影响（已 ÷100）
 */

const SQRT_2PI = Math.sqrt(2 * Math.PI);

// 标准正态累积分布函数（Abramowitz & Stegun 7.1.26 近似，|误差| < 1.5e-7）
export function normCdf(x) {
  const t = 1 / (1 + 0.231641 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

// 标准正态概率密度函数
export function normPdf(x) {
  return Math.exp((-x * x) / 2) / SQRT_2PI;
}

function round(n, dp) {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

/**
 * 单个期权（call/put）的价格 + 希腊字母。
 * @returns {{type,strike,spot,price,delta,gamma,theta,vega,moneyness,iv,t,r}}
 */
export function priceOption(type, spot, strike, { r = 0.04, t, iv } = {}) {
  const moneyness = round((spot - strike) / strike, 4);
  // 退化：到期（t≤0）或零/负波动 → 仅内在价值，希腊字母全 0
  if (!(t > 0) || !(iv > 0) || spot <= 0 || strike <= 0) {
    const intrinsic = type === "call" ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
    return {
      type, strike, spot,
      price: round(intrinsic, 2),
      delta: 0, gamma: 0, theta: 0, vega: 0,
      moneyness, iv, t, r,
    };
  }

  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (r + 0.5 * iv * iv) * t) / (iv * sqrtT);
  const d2 = d1 - iv * sqrtT;
  const Nd1 = normCdf(d1);
  const Nd2 = normCdf(d2);
  const pdfD1 = normPdf(d1);
  const disc = Math.exp(-r * t); // 折现因子 e^{-rt}

  const gamma = pdfD1 / (spot * iv * sqrtT);
  const vega = (spot * pdfD1 * sqrtT) / 100; // 每 1% 波动率

  let price, delta, theta;
  if (type === "call") {
    price = spot * Nd1 - strike * disc * Nd2;
    delta = Nd1;
    theta = (-spot * pdfD1 * iv / (2 * sqrtT) - r * strike * disc * Nd2) / 365;
  } else {
    const nNegD1 = 1 - Nd1; // N(-d1)
    const nNegD2 = 1 - Nd2; // N(-d2)
    price = strike * disc * nNegD2 - spot * nNegD1;
    delta = Nd1 - 1;
    theta = (-spot * pdfD1 * iv / (2 * sqrtT) + r * strike * disc * nNegD2) / 365;
  }

  return {
    type,
    strike,
    spot,
    price: round(price, 2),
    delta: round(delta, 4),
    gamma: round(gamma, 4),
    theta: round(theta, 4),
    vega: round(vega, 4),
    moneyness,
    iv,
    t,
    r,
  };
}

/**
 * 生成一条期权链：围绕现货的 strike 区间，calls 与 puts 各一份。
 * @param {object} [cfg]
 * @param {number} cfg.spot   现价（必须 > 0）
 * @param {number} [cfg.iv=0.2]    隐含波动率（小数）
 * @param {number} [cfg.r=0.04]    无风险利率（小数）
 * @param {number} [cfg.t]         距到期年数（必须 > 0）
 * @param {number[]} [cfg.strikes] 自定义行权价数组；缺省按 spot 的 ±偏移生成
 * @param {number[]} [cfg.pct]     偏移比例（缺省 ±10/20/30%）
 * @returns {{symbol,spot,iv,r,t,model,calls,puts}}
 * @throws 当 spot 非正或 t 非正
 */
export function computeOptionChain({ symbol = null, spot, iv = 0.2, r = 0.04, t, strikes = null, pct = null } = {}) {
  if (!(spot > 0)) throw new Error("computeOptionChain: spot must be positive");
  if (!(t > 0)) throw new Error("computeOptionChain: t (time to expiry, years) must be positive");

  const offsets = pct || [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3];
  const strikeList =
    Array.isArray(strikes) && strikes.length > 0
      ? strikes.slice().sort((a, b) => a - b)
      : offsets.map((o) => round(spot * (1 + o), 2));

  const calls = [];
  const puts = [];
  for (const K of strikeList) {
    calls.push(priceOption("call", spot, K, { r, t, iv }));
    puts.push(priceOption("put", spot, K, { r, t, iv }));
  }
  calls.sort((a, b) => a.strike - b.strike);
  puts.sort((a, b) => b.strike - a.strike); // puts 高 strike 在上，阅读习惯

  return { symbol, spot, iv, r, t, model: "black-scholes", calls, puts };
}
