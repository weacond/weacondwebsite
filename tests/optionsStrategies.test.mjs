// 期权组合盈亏分析测试（lib/optionsStrategies.js）。
// 用已知盈亏关系断言：净权利金、最大盈亏、盈亏平衡 = K + 净支出 等。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  strategyPremium,
  strategyPayoffAt,
  analyzeStrategy,
  strategyTemplates,
  probOfProfit,
  strategyGreeks,
  deltaHedge,
} from "../lib/optionsStrategies.js";

const OPTS = { spot: 100, r: 0.05, t: 1, iv: 0.2 };

// ---------- strategyPremium ----------

test("strategyPremium: 买 call 为净支出(debit > 0)", () => {
  const net = strategyPremium([{ type: "call", strike: 100, qty: 1 }], 100, OPTS);
  assert.ok(net > 0, "买 call 应为净支出");
});

test("strategyPremium: 卖 call 为净收入(credit < 0)", () => {
  const net = strategyPremium([{ type: "call", strike: 100, qty: -1 }], 100, OPTS);
  assert.ok(net < 0, "卖 call 应为净收入");
});

test("strategyPremium: 价差(买低卖高)净支出为正且小于单腿", () => {
  const single = strategyPremium([{ type: "call", strike: 100, qty: 1 }], 100, OPTS);
  const spread = strategyPremium([
    { type: "call", strike: 100, qty: 1 },
    { type: "call", strike: 110, qty: -1 },
  ], 100, OPTS);
  assert.ok(spread > 0 && spread < single, "价差净支出应介于 0 与单腿之间");
});

// ---------- strategyPayoffAt ----------

test("strategyPayoffAt: 实值 call 盈亏 = 内在价值 − 净权利金", () => {
  const legs = [{ type: "call", strike: 100, qty: 1 }];
  const premium = strategyPremium(legs, 100, OPTS);
  const pl = strategyPayoffAt(legs, 150, premium); // 内在价值 50
  assert.ok(Math.abs(pl - (50 - premium)) < 0.01, `got ${pl}`);
});

test("strategyPayoffAt: 虚值 call 到期归零，盈亏 = −净权利金", () => {
  const legs = [{ type: "call", strike: 110, qty: 1 }];
  const premium = strategyPremium(legs, 100, OPTS);
  const pl = strategyPayoffAt(legs, 105, premium); // S<K，内在价值 0
  assert.ok(Math.abs(pl - (-premium)) < 0.01, `got ${pl}`);
});

// ---------- analyzeStrategy ----------

test("analyzeStrategy: 空腿数组 → 抛错", () => {
  assert.throws(() => analyzeStrategy([], OPTS), /至少需要一条腿/);
});

test("analyzeStrategy: 买 call → 上端无界、最大亏损=−净支出、盈亏平衡=K+净支出", () => {
  const legs = [{ type: "call", strike: 100, qty: 1 }];
  const res = analyzeStrategy(legs, OPTS);
  assert.equal(res.unboundedProfit, true);
  assert.equal(res.maxProfit, null); // 无界
  assert.ok(Math.abs(res.maxLoss - (-res.premium)) < 0.02, `maxLoss=${res.maxLoss} vs -${res.premium}`);
  assert.ok(res.breakEvens.length >= 1, "应有盈亏平衡点");
  const be = 100 + res.premium;
  assert.ok(Math.abs(res.breakEvens[0] - be) < 0.05, `盈亏平衡 ${res.breakEvens[0]} vs ${be.toFixed(2)}`);
});

test("analyzeStrategy: 牛市看涨价差 → 最大盈利=价差宽度−净支出（有界）", () => {
  const legs = [
    { type: "call", strike: 100, qty: 1 },
    { type: "call", strike: 110, qty: -1 },
  ];
  const res = analyzeStrategy(legs, OPTS);
  assert.equal(res.unboundedProfit, false);
  assert.ok(res.maxProfit !== null, "价差最大盈利应有界");
  // 最大盈利 = (K2−K1) − 净支出 = 10 − premium
  assert.ok(Math.abs(res.maxProfit - (10 - res.premium)) < 0.03, `maxProfit=${res.maxProfit}`);
  assert.ok(Math.abs(res.maxLoss - (-res.premium)) < 0.02, `maxLoss=${res.maxLoss}`);
});

test("analyzeStrategy: 买入跨式 → 两个盈亏平衡点(100±净支出)", () => {
  const legs = [
    { type: "call", strike: 100, qty: 1 },
    { type: "put", strike: 100, qty: 1 },
  ];
  const res = analyzeStrategy(legs, OPTS);
  assert.equal(res.breakEvens.length, 2, "跨式应恰好 2 个盈亏平衡点");
  const lower = 100 - res.premium;
  const higher = 100 + res.premium;
  assert.ok(Math.abs(res.breakEvens[0] - lower) < 0.05, `下平衡 ${res.breakEvens[0]} vs ${lower.toFixed(2)}`);
  assert.ok(Math.abs(res.breakEvens[1] - higher) < 0.05, `上平衡 ${res.breakEvens[1]} vs ${higher.toFixed(2)}`);
});

test("analyzeStrategy: 备兑看涨 → 上下端均有界(含 stock 腿)", () => {
  const legs = [
    { type: "share", qty: 1 },
    { type: "call", strike: 110, qty: -1 },
  ];
  const res = analyzeStrategy(legs, OPTS);
  assert.equal(res.unboundedProfit, false, "备兑最大盈利有界(被 call 行权价封顶)");
  assert.equal(res.unboundedLoss, false, "备兑最大亏损有界");
  assert.ok(res.maxProfit !== null && res.maxLoss !== null);
});

test("analyzeStrategy: payoffCurve 覆盖 0→上界且单调合理", () => {
  const res = analyzeStrategy([{ type: "call", strike: 100, qty: 1 }], OPTS);
  assert.ok(res.payoffCurve.length > 10);
  assert.equal(res.payoffCurve[0].price, 0);
  // 买 call 的 P/L 随标的上涨而单调不减
  for (let i = 1; i < res.payoffCurve.length; i++) {
    assert.ok(res.payoffCurve[i].profit >= res.payoffCurve[i - 1].profit - 1e-9, "P/L 应单调不减");
  }
});

// ---------- strategyTemplates ----------

test("strategyTemplates: 9 个常见策略，腿数与结构正确", () => {
  const tpl = strategyTemplates(100, 100, 110);
  assert.equal(tpl.length, 9);
  const byId = Object.fromEntries(tpl.map((t) => [t.id, t]));
  assert.equal(byId.long_call.legs.length, 1);
  assert.equal(byId.bull_call_spread.legs.length, 2);
  assert.equal(byId.long_straddle.legs.length, 2);
  assert.ok(byId.covered_call.legs.some((l) => l.type === "share"), "备兑含股票腿");
  // 新增：铁蝶 4 腿、风险定义(上下端均有界)、净收入(credit)
  assert.equal(byId.iron_condor.legs.length, 4);
  const ic = analyzeStrategy(byId.iron_condor.legs, OPTS);
  assert.equal(ic.unboundedProfit, false, "铁蝶最大盈利有界");
  assert.equal(ic.unboundedLoss, false, "铁蝶最大亏损有界");
  assert.ok(ic.premium < 0, "铁蝶为净收入(credit)");
  assert.ok(ic.maxProfit > 0, "铁蝶最大盈利=收入>0");
  // 空跨式：净收入 + 两侧亏损无界
  const ss = analyzeStrategy(byId.short_straddle.legs, OPTS);
  assert.ok(ss.premium < 0, "空跨式为净收入");
  assert.equal(ss.unboundedLoss, true, "空跨式亏损无界");
  // 风险反转可分析
  const rr = analyzeStrategy(byId.risk_reversal.legs, OPTS);
  assert.ok(rr.premium !== undefined, "风险反转可分析");
  // 每个模板都应能被分析而不抛错
  for (const t of tpl) {
    const res = analyzeStrategy(t.legs, OPTS);
    assert.ok(res.premium !== undefined, `${t.id} 可分析`);
  }
});

// ---------- probOfProfit（到期盈利概率） ----------

test("probOfProfit: 落在 [0,1]", () => {
  const pop = probOfProfit([{ type: "call", strike: 100, qty: 1 }], OPTS);
  assert.ok(pop >= 0 && pop <= 1, `POP=${pop}`);
});

test("probOfProfit: 实值 call 的 POP > 虚值 call 的 POP", () => {
  const itM = probOfProfit([{ type: "call", strike: 90, qty: 1 }], OPTS); // 实值
  const otM = probOfProfit([{ type: "call", strike: 110, qty: 1 }], OPTS); // 虚值
  assert.ok(itM > otM, `ITM ${itM} 应 > OTM ${otM}`);
});

test("probOfProfit: 买入跨式 POP 介于 (0,1) 且 > 0.1", () => {
  const pop = probOfProfit([
    { type: "call", strike: 100, qty: 1 },
    { type: "put", strike: 100, qty: 1 },
  ], OPTS);
  assert.ok(pop > 0.1 && pop < 1, `跨式 POP=${pop}`);
});

test("probOfProfit: 退化 t=0 → null（无分布）", () => {
  assert.equal(probOfProfit([{ type: "call", strike: 100, qty: 1 }], { ...OPTS, t: 0 }), null);
});

// ---------- strategyGreeks（多腿净希腊字母） ----------

test("strategyGreeks: 单腿 long call 净希腊符号（Δ>0, Γ>0, V>0, Θ<0, ρ>0）", () => {
  const g = strategyGreeks([{ type: "call", strike: 100, qty: 1 }], OPTS);
  assert.ok(g.delta > 0, "call delta > 0");
  assert.ok(g.gamma > 0, "call gamma > 0");
  assert.ok(g.vega > 0, "call vega > 0");
  assert.ok(g.theta < 0, "long call theta < 0");
  assert.ok(g.rho > 0, "call rho > 0");
});

test("strategyGreeks: long 与 short 净希腊互为相反数（线性叠加）", () => {
  const long = strategyGreeks([{ type: "call", strike: 100, qty: 1 }], OPTS);
  const short = strategyGreeks([{ type: "call", strike: 100, qty: -1 }], OPTS);
  for (const k of ["delta", "gamma", "theta", "vega", "rho"]) {
    assert.ok(Math.abs(long[k] + short[k]) < 1e-3, `${k} 反号对称, got ${long[k]}/${short[k]}`);
  }
});

test("strategyGreeks: 牛市看涨价差净 delta ∈ (0,1)", () => {
  const g = strategyGreeks([
    { type: "call", strike: 90, qty: 1 },
    { type: "call", strike: 110, qty: -1 },
  ], OPTS);
  assert.ok(g.delta > 0 && g.delta < 1, `净 delta=${g.delta} 应 ∈ (0,1)`);
});

test("strategyGreeks: 备兑看涨 share 贡献 delta=1（净 delta∈(0,1)、gamma<0）", () => {
  const g = strategyGreeks([
    { type: "share", qty: 1 },
    { type: "call", strike: 110, qty: -1 },
  ], OPTS);
  assert.ok(g.delta > 0 && g.delta < 1, `净 delta=${g.delta} 应 ∈ (0,1)`);
  assert.ok(g.gamma < 0, "卖 call → 净 gamma < 0");
  const onlyShare = strategyGreeks([{ type: "share", qty: 3 }], OPTS);
  assert.equal(onlyShare.delta, 3);
  assert.equal(onlyShare.gamma, 0);
  assert.equal(onlyShare.vega, 0);
});

test("strategyGreeks: 退化 t=0 → 期权腿希腊全 0，share delta 保留", () => {
  const g = strategyGreeks(
    [{ type: "call", strike: 100, qty: 1 }, { type: "share", qty: 2 }],
    { ...OPTS, t: 0 }
  );
  assert.equal(g.gamma, 0, "t=0 gamma=0");
  assert.equal(g.vega, 0, "t=0 vega=0");
  assert.equal(g.delta, 2, "t=0 仅 share delta=2");
});

test("strategyGreeks: 非法输入（非数组 / 缺 qty）→ 全 0", () => {
  const zero = { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  assert.deepEqual(strategyGreeks(null, OPTS), zero);
  assert.deepEqual(strategyGreeks([{ type: "call", strike: 100 }], OPTS), zero);
});

// ---------- deltaHedge（delta 中性对冲股数） ----------

test("deltaHedge: 空 / 非法 legs → 0", () => {
  assert.equal(deltaHedge(null, OPTS), 0);
  assert.equal(deltaHedge([], OPTS), 0);
});

test("deltaHedge: long call 净多头 delta → 需做空标的（shares < 0）", () => {
  const h = deltaHedge([{ type: "call", strike: 100, qty: 1 }], OPTS);
  assert.ok(h < 0, `long call 应做空对冲, got ${h}`);
});

test("deltaHedge: long put 净空头 delta → 需做多标的（shares > 0）", () => {
  const h = deltaHedge([{ type: "put", strike: 100, qty: 1 }], OPTS);
  assert.ok(h > 0, `long put 应做多对冲, got ${h}`);
});

test("deltaHedge: = −净 delta（与 strategyGreeks 一致）", () => {
  const legs = [{ type: "call", strike: 90, qty: 1 }, { type: "call", strike: 110, qty: -1 }];
  const g = strategyGreeks(legs, OPTS);
  assert.ok(Math.abs(deltaHedge(legs, OPTS) + g.delta) < 1e-3, "hedge = −净 delta");
});

test("deltaHedge: long/short 对称 hedge([c,1]) = −hedge([c,−1])", () => {
  const a = deltaHedge([{ type: "call", strike: 100, qty: 1 }], OPTS);
  const b = deltaHedge([{ type: "call", strike: 100, qty: -1 }], OPTS);
  assert.ok(Math.abs(a + b) < 1e-3, `对称, got ${a}/${b}`);
});


