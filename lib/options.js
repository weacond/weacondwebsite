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
 *   rho    每 1% 无风险利率变化的价格影响（已 ÷100）
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
 * 期权希腊字母（Black-Scholes-Merton）。返回 delta/gamma/theta/vega/rho，口径与
 * priceOption 完全一致（delta/gamma/vega/theta 不变，新增 rho）：
 *   delta  = ∂P/∂S        call∈(0,1)、put∈(−1,0)
 *   gamma  = ∂²P/∂S²      恒 > 0（call/put 对称）
 *   theta  = 每日时间衰减（÷365），多为负
 *   vega   = 每 1% 波动率的价格影响（÷100），恒 > 0（call/put 对称）
 *   rho    = 每 1% 无风险利率的价格影响（÷100）；call > 0、put < 0
 * 退化（t≤0 / iv≤0 / spot≤0 / strike≤0）→ 全 0（仅内在价值，无希腊）。
 * @returns {{delta,gamma,theta,vega,rho,moneyness,iv,t,r}} 希腊字母全 round(4)
 */
export function optionGreeks(type, spot, strike, { r = 0.04, t, iv } = {}) {
  const moneyness = round((spot - strike) / strike, 4);
  // 退化：到期 / 零负波动 / 非正价 → 希腊字母全 0
  if (!(t > 0) || !(iv > 0) || spot <= 0 || strike <= 0) {
    return { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, moneyness, iv, t, r };
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
  let delta, theta, rho;
  if (type === "call") {
    delta = Nd1;
    theta = (-spot * pdfD1 * iv / (2 * sqrtT) - r * strike * disc * Nd2) / 365;
    rho = (strike * t * disc * Nd2) / 100; // 每 1% 利率，call 为正
  } else {
    const nNegD1 = 1 - Nd1; // N(-d1)
    const nNegD2 = 1 - Nd2; // N(-d2)
    theta = (-spot * pdfD1 * iv / (2 * sqrtT) + r * strike * disc * nNegD2) / 365;
    delta = Nd1 - 1;
    rho = (-strike * t * disc * nNegD2) / 100; // put 为负
  }

  return {
    delta: round(delta, 4),
    gamma: round(gamma, 4),
    theta: round(theta, 4),
    vega: round(vega, 4),
    rho: round(rho, 4),
    moneyness,
    iv,
    t,
    r,
  };
}

/**
 * 单个期权（call/put）的价格 + 希腊字母（复用 optionGreeks，DRY）。
 * @returns {{type,strike,spot,price,delta,gamma,theta,vega,rho,moneyness,iv,t,r}}
 */
export function priceOption(type, spot, strike, { r = 0.04, t, iv } = {}) {
  const g = optionGreeks(type, spot, strike, { r, t, iv });
  let price;
  if (!(t > 0) || !(iv > 0) || spot <= 0 || strike <= 0) {
    // 退化：仅内在价值
    price = type === "call" ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
  } else {
    const sqrtT = Math.sqrt(t);
    const d1 = (Math.log(spot / strike) + (r + 0.5 * iv * iv) * t) / (iv * sqrtT);
    const d2 = d1 - iv * sqrtT;
    const Nd1 = normCdf(d1);
    const Nd2 = normCdf(d2);
    const disc = Math.exp(-r * t);
    price = type === "call" ? spot * Nd1 - strike * disc * Nd2 : strike * disc * (1 - Nd2) - spot * (1 - Nd1);
  }
  return { type, strike, spot, price: round(price, 2), ...g };
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

// 未取整的 B-S 价格（供 IV 求解器二分收敛用）
function rawPrice(type, spot, strike, { r, t, iv }) {
  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (r + 0.5 * iv * iv) * t) / (iv * sqrtT);
  const d2 = d1 - iv * sqrtT;
  const disc = Math.exp(-r * t);
  if (type === "call") {
    return spot * normCdf(d1) - strike * disc * normCdf(d2);
  }
  return strike * disc * (1 - normCdf(d2)) - spot * (1 - normCdf(d1));
}

/**
 * 隐含波动率求解器：已知市场价，反解使 B-S 价 = marketPrice 的 IV。
 * 价格随 IV 单调增（vega>0），故用二分法。
 *
 * @param {number} marketPrice 市场价（必须 > 0）
 * @param {number} spot 现价
 * @param {number} strike 行权价
 * @param {object} [opts] { type='call', r=0.04, t, lo, hi, tol, maxIter }
 * @returns {{ iv, ok, reason?, iterations? }}
 *   - ok=true：成功反解，iv∈[lo,hi]
 *   - ok=false：市场价越界（低于内在价值 / 高于 hi 处价格）或退化
 */
export function impliedVol(
  marketPrice,
  spot,
  strike,
  { type = "call", r = 0.04, t, lo = 0.0001, hi = 5, tol = 1e-5, maxIter = 100 } = {}
) {
  const degenerate = !(t > 0) || spot <= 0 || strike <= 0 || !(marketPrice > 0);
  if (degenerate) return { iv: 0, ok: false, reason: "degenerate" };

  const intrinsic = type === "call" ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
  const priceLo = rawPrice(type, spot, strike, { r, t, iv: lo });
  const priceHi = rawPrice(type, spot, strike, { r, t, iv: hi });

  // 市场价低于 lo 处价格：若仍 ≥ 内在价值则 IV 触底，否则为非法（折价于内在价值）
  if (marketPrice <= priceLo) {
    return { iv: 0, ok: marketPrice >= intrinsic - 1e-6, reason: marketPrice < intrinsic - 1e-6 ? "below_intrinsic" : "floor" };
  }
  if (marketPrice >= priceHi) {
    return { iv: hi, ok: false, reason: "above_cap" };
  }

  let a = lo, b = hi;
  for (let i = 0; i < maxIter; i++) {
    const mid = (a + b) / 2;
    const p = rawPrice(type, spot, strike, { r, t, iv: mid });
    if (Math.abs(p - marketPrice) < tol || (b - a) / 2 < tol) {
      return { iv: round(mid, 4), ok: true, iterations: i + 1 };
    }
    if (p < marketPrice) a = mid; else b = mid;
  }
  return { iv: round((a + b) / 2, 4), ok: true, iterations: maxIter };
}

/**
 * 风险中性"到期实值概率"（probability of finishing ITM）。
 * call: N(d2)；put: N(-d2)。这是风险中性测度下的概率，非真实世界概率。
 * 退化(t≤0/iv≤0)：按内在值——实值→1，否则→0。
 * @returns {number} 概率，∈[0,1]
 */
export function probITM(type, spot, strike, { r = 0.04, t, iv } = {}) {
  if (!(t > 0) || !(iv > 0) || spot <= 0 || strike <= 0) {
    const intrinsic = type === "call" ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
    return intrinsic > 0 ? 1 : 0;
  }
  const sqrtT = Math.sqrt(t);
  const d2 = (Math.log(spot / strike) + (r - 0.5 * iv * iv) * t) / (iv * sqrtT);
  const p = type === "call" ? normCdf(d2) : normCdf(-d2);
  return round(Math.min(1, Math.max(0, p)), 4);
}

// 清洗历史：仅保留有限数值
function cleanHistory(history) {
  return (Array.isArray(history) ? history : [])
    .filter((x) => typeof x === "number" && Number.isFinite(x));
}

/**
 * IV Rank：当前 IV 在过去历史 IV 区间 [min,max] 中的位置（0-100，钳制）。
 * 标准定义：(current − min) / (max − min) × 100。
 * 无历史 / 无离散度 → 中性 50。current 越界时钳制到 [0,100]。
 * @returns {number} 0-100
 */
export function ivRank(current, history) {
  const arr = cleanHistory(history);
  if (current == null || !Number.isFinite(current)) return 50;
  if (arr.length === 0) return 50; // 无历史 → 中性
  const min = Math.min(...arr, current);
  const max = Math.max(...arr, current);
  if (max === min) return 50; // 无离散度
  const raw = ((current - min) / (max - min)) * 100;
  return round(Math.min(100, Math.max(0, raw)), 1);
}

/**
 * IV Percentile：历史中 ≤ 当前 IV 的比例（0-100）。比 IV Rank 对离群值更稳健。
 * 无历史 / current 非数 → 中性 50。
 * @returns {number} 0-100
 */
export function ivPercentile(current, history) {
  const arr = cleanHistory(history);
  if (current == null || !Number.isFinite(current)) return 50;
  if (arr.length === 0) return 50;
  const belowOrEqual = arr.filter((x) => x <= current).length;
  return round((belowOrEqual / arr.length) * 100, 1);
}

/**
 * 把 IV Rank 分档，指导期权买方/卖方策略选择。
 * <20 买方优势（IV 便宜）；>80 卖方优势（IV 贵，Theta 高）；其余中性。
 * @returns {("low"|"neutral"|"high")}
 */
export function classifyIVRank(rank) {
  if (rank < 20) return "low";
  if (rank > 80) return "high";
  return "neutral";
}

/**
 * 生成波动率微笑：沿 moneyness（strike/spot）的隐含波动率剖面。
 * IV(m) = baseIV + convexity·(m−1)² + skew·(m−1)
 * - convexity>0 → U 形（两翼 IV 高于平值，典型微笑）
 * - skew<0 → 虚值看跌(m<1) 一侧 IV 更高（股指典型负偏：put 比 call 贵）
 * @param {object} o
 * @param {number} o.spot 现价
 * @param {number} o.baseIV 平值 IV
 * @param {number} [o.skew=0] 线性偏斜
 * @param {number} [o.convexity=0] 二阶凸性
 * @param {number} [o.moneynessFrom=0.8] moneyness 下界
 * @param {number} [o.moneynessTo=1.2] moneyness 上界
 * @param {number} [o.steps=11] 采样点数（含端点）
 * @returns {Array<{moneyness:number, strike:number, iv:number}>} iv 恒 >0
 */
export function volSmile({
  spot,
  baseIV,
  skew = 0,
  convexity = 0,
  moneynessFrom = 0.8,
  moneynessTo = 1.2,
  steps = 11,
} = {}) {
  if (!(spot > 0) || !(baseIV > 0) || !(steps >= 1)) return [];
  const out = [];
  const denom = steps - 1 || 1;
  for (let i = 0; i < steps; i++) {
    const m = moneynessFrom + (moneynessTo - moneynessFrom) * (i / denom);
    const d = m - 1;
    const iv = baseIV + convexity * d * d + skew * d;
    out.push({
      moneyness: +m.toFixed(3),
      strike: +(spot * m).toFixed(2),
      iv: +Math.max(0.001, iv).toFixed(4),
    });
  }
  return out;
}




