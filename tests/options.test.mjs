// 期权定价测试 — Black-Scholes-Merton（lib/options.js）。
// 测试哲学：用**不依赖教材常数**的自洽关系断言（put-call parity、希腊字母恒等式、
// normCdf 锚点、退化情形），避免把"背下来的数字"当 oracle。
import { test } from "node:test";
import assert from "node:assert/strict";
import { normCdf, normPdf, priceOption, computeOptionChain } from "../lib/options.js";

// ---------- normCdf / normPdf 锚点 ----------

test("normCdf: 标准锚点（0→0.5, 1.96→≈0.975, 对称）", () => {
  assert.ok(Math.abs(normCdf(0) - 0.5) < 1e-4, "0 → 0.5（近似）");
  assert.ok(Math.abs(normCdf(1.96) - 0.975) < 0.001, "1.96 → ≈0.975");
  assert.ok(Math.abs(normCdf(-1.96) - 0.025) < 0.001, "对称");
  assert.ok(normCdf(10) > 0.99999, "大正值 → ≈1");
  assert.ok(normCdf(-10) < 0.00001, "大负值 → ≈0");
});

test("normPdf: 0 处取峰值 1/√(2π) ≈ 0.3989", () => {
  assert.ok(Math.abs(normPdf(0) - 0.3989423) < 1e-4);
  assert.ok(normPdf(0) > normPdf(1), "峰在 0");
});

// ---------- priceOption：put-call parity + 希腊字母恒等式 ----------

// 同一 (S,K,r,t,iv) 下，call 与 put 必须满足平价关系（与 IV 无关）
test("put-call parity: call − put = S − K·e^(−rT)", () => {
  const S = 100, K = 100, r = 0.05, t = 1, iv = 0.2;
  const call = priceOption("call", S, K, { r, t, iv });
  const put = priceOption("put", S, K, { r, t, iv });
  const theoretical = S - K * Math.exp(-r * t); // 100 − 100·e^−0.05 ≈ 4.877
  // 二者各自四舍五入到 2 位，故容差 0.02
  assert.ok(Math.abs((call.price - put.price) - theoretical) < 0.02,
    `call-put=${(call.price - put.price).toFixed(3)} vs 理论 ${theoretical.toFixed(3)}`);
});

test("希腊字母恒等式: delta_put = delta_call − 1；gamma_call = gamma_put", () => {
  const c = priceOption("call", 100, 100, { r: 0.05, t: 1, iv: 0.2 });
  const p = priceOption("put", 100, 100, { r: 0.05, t: 1, iv: 0.2 });
  assert.ok(Math.abs(c.delta - (p.delta + 1)) < 1e-3, "delta_put = delta_call − 1");
  assert.ok(Math.abs(c.gamma - p.gamma) < 1e-3, "gamma 对称");
  assert.ok(Math.abs(c.vega - p.vega) < 1e-3, "vega 对称");
});

test("希腊字母符号: call delta∈(0,1)、put delta∈(0,1)、gamma/vega>0、theta<0", () => {
  const c = priceOption("call", 100, 100, { r: 0.04, t: 0.5, iv: 0.25 });
  assert.ok(c.delta > 0 && c.delta < 1, "call delta ∈ (0,1)");
  const p = priceOption("put", 100, 100, { r: 0.04, t: 0.5, iv: 0.25 });
  assert.ok(p.delta < 0 && p.delta > -1, "put delta ∈ (−1,0)");
  assert.ok(c.gamma > 0, "gamma > 0");
  assert.ok(c.vega > 0, "vega > 0");
  assert.ok(c.theta < 0, "theta < 0（时间衰减为负）");
});

test("深度实值 call: delta → 1，价格 → S − K·e^(−rT)（近似远期价）", () => {
  const S = 200, K = 100, r = 0.04, t = 1, iv = 0.2;
  const c = priceOption("call", S, K, { r, t, iv });
  assert.ok(c.delta >= 0.99, "深度实值 delta ≈ 1, got " + c.delta);
  const theoretical = S - K * Math.exp(-r * t); // ≈ 103.92
  assert.ok(Math.abs(c.price - theoretical) < 0.05, `价格≈远期价, got ${c.price}`);
});

test("ATM call delta 落在 (0.6, 0.67)（S=K, r=0.05, iv=0.2, t=1 → d1≈0.35）", () => {
  const c = priceOption("call", 100, 100, { r: 0.05, t: 1, iv: 0.2 });
  assert.ok(c.delta > 0.6 && c.delta < 0.67, "ATM call delta ≈ 0.6368, got " + c.delta);
});

test("退化 t=0: 仅内在价值，希腊字母全 0", () => {
  const c = priceOption("call", 100, 90, { r: 0.04, t: 0, iv: 0.2 });
  assert.equal(c.price, 10); // 内在价值 100−90
  assert.equal(c.delta, 0);
  assert.equal(c.gamma, 0);
  assert.equal(c.theta, 0);
  assert.equal(c.vega, 0);
  // 虚值 put（K<S）在 t=0 → 内在价值 0
  const p = priceOption("put", 100, 90, { r: 0.04, t: 0, iv: 0.2 });
  assert.equal(p.price, 0);
});

test("非法输入: spot≤0 或 iv≤0 → 仅内在价值，不产生 NaN", () => {
  const c = priceOption("call", 100, 100, { iv: 0, t: 1, r: 0.04 });
  assert.equal(c.price, 0); // ATM 零波动 → 0 内在价值
  assert.ok(Number.isFinite(c.price));
  assert.ok(Number.isFinite(c.delta));
});

// ---------- computeOptionChain ----------

test("computeOptionChain: 形状 + 排序 + 模型标记", () => {
  const chain = computeOptionChain({ symbol: "SPY", spot: 100, iv: 0.2, r: 0.04, t: 1 });
  assert.equal(chain.model, "black-scholes");
  assert.equal(chain.symbol, "SPY");
  assert.equal(chain.calls.length, chain.puts.length);
  assert.ok(chain.calls.length >= 5, "默认 ≥5 档 strike");
  // calls 按 strike 升序；puts 按 strike 降序
  for (let i = 1; i < chain.calls.length; i++) {
    assert.ok(chain.calls[i].strike >= chain.calls[i - 1].strike, "calls 升序");
  }
  for (let i = 1; i < chain.puts.length; i++) {
    assert.ok(chain.puts[i].strike <= chain.puts[i - 1].strike, "puts 降序");
  }
});

test("computeOptionChain: 自定义 strikes 被采用并排序", () => {
  const chain = computeOptionChain({ spot: 100, t: 1, strikes: [120, 80, 100] });
  assert.deepEqual(chain.calls.map((o) => o.strike), [80, 100, 120]);
});

test("computeOptionChain: 非法 spot / t 抛错", () => {
  assert.throws(() => computeOptionChain({ spot: 0, t: 1 }), /spot/);
  assert.throws(() => computeOptionChain({ spot: 100, t: 0 }), /t/);
  assert.throws(() => computeOptionChain({ spot: 100, t: -1 }), /t/);
});

test("computeOptionChain: 每个价位都满足 put-call parity", () => {
  const chain = computeOptionChain({ spot: 150, iv: 0.3, r: 0.05, t: 0.5 });
  for (let i = 0; i < chain.calls.length; i++) {
    const call = chain.calls[i];
    const put = chain.puts[chain.calls.length - 1 - i]; // 同 strike（反向）
    assert.equal(call.strike, put.strike, "对齐同 strike");
    const theoretical = 150 - call.strike * Math.exp(-0.05 * 0.5);
    assert.ok(Math.abs((call.price - put.price) - theoretical) < 0.02,
      `parity @K=${call.strike}`);
  }
});
