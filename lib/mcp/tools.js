// lib/mcp/tools.js — MCP 工具注册表：把计算器纯函数封装为 MCP 工具
//
// 每个工具 { name, title, description, category, inputSchema, run }。
//  - inputSchema 为 JSON Schema 子集，做入参粗校验；
//  - run(args) 调用对应 lib 的 *Summary 纯函数做域校验并返回结构化结果；
//  - callTool 统一封装：未知工具 / 入参非法 / 域校验失败 → isError + 结构化错误。
// 纯函数、确定性、无副作用；可被 Node 与 Edge 运行时导入。

import { kellySummary } from "../kelly.js";
import { atrSummary } from "../atrStop.js";
import { ruinSummary } from "../ruin.js";
import { riskBudgetSummary } from "../riskBudget.js";
import { ddSizingSummary } from "../drawdownSizing.js";
import {
  leveragedPnl,
  liquidationPrice,
  liquidationMove,
  leverageBand,
} from "../leverage.js";
import { expectancySummary } from "../expectancy.js";
import { breakevenSummary } from "../breakeven.js";
import { rPositionSummary } from "../rPosition.js";
import { marginSummary } from "../margin.js";
import { fundingSummary } from "../fundingRate.js";
import { npvSummary } from "../npvCalc.js";
import { validateSchema } from "./schema.js";

// 杠杆工具没有单一 *Summary，用纯函数组合一个复合视图。
function leverageRun(a) {
  const side = a.side === "short" ? "short" : "long";
  const mm = Number.isFinite(a.mmPct) ? a.mmPct : 0;
  try {
    const out = {
      valid: true,
      leverage: Number(a.leverage),
      side,
      mmPct: mm,
      liquidationMovePct: liquidationMove(a.leverage, mm),
      band: leverageBand(a.leverage).band,
    };
    if (Number.isFinite(a.movePct)) out.equityPct = leveragedPnl(a.movePct, a.leverage, side);
    if (a.entry != null && Number(a.entry) > 0) {
      out.liquidationPrice = liquidationPrice(Number(a.entry), a.leverage, side, mm);
    }
    return out;
  } catch (e) {
    return { valid: false, reason: e.message || "invalid" };
  }
}

export const TOOLS = [
  {
    name: "kelly",
    title: "Kelly 仓位比例",
    category: "risk",
    description:
      "给定胜率 p 与净赔率 b，计算 Kelly 最优仓位 f*、分数 Kelly（½/¼）、每单位期望与长期增长率。f*≤0 表示无正期望、应不下注。",
    inputSchema: {
      type: "object",
      properties: {
        winRate: { type: "number", description: "胜率 p ∈ [0,1]", minimum: 0, maximum: 1 },
        odds: { type: "number", description: "净赔率 b（每押 1 单位赢 b，>0）", exclusiveMinimum: 0 },
      },
      required: ["winRate", "odds"],
      additionalProperties: false,
    },
    run: (a) => kellySummary(a),
  },
  {
    name: "atr_stop",
    title: "ATR 止损距离",
    category: "risk",
    description:
      "按 风险% × 账户 = 止损距离 × 股数 求头寸规模、止损价、风险金额与盈亏比 R:R。",
    inputSchema: {
      type: "object",
      properties: {
        account: { type: "number", description: "账户权益 ≥ 0", minimum: 0 },
        riskPct: { type: "number", description: "单笔风险 % ∈ [0,100]", minimum: 0, maximum: 100 },
        side: { type: "string", enum: ["long", "short"], description: "方向" },
        entry: { type: "number", description: "入场价 > 0", exclusiveMinimum: 0 },
        atrVal: { type: "number", description: "ATR > 0", exclusiveMinimum: 0 },
        mult: { type: "number", description: "ATR 倍数，默认 2", minimum: 0 },
        target: { type: "number", description: "目标价（可选）", exclusiveMinimum: 0 },
      },
      required: ["account", "riskPct", "side", "entry", "atrVal"],
      additionalProperties: false,
    },
    run: (a) => atrSummary(a),
  },
  {
    name: "risk_of_ruin",
    title: "破产概率",
    category: "risk",
    description:
      "给定胜率、盈亏比 R:R 与以 R 计的资本，计算破产概率（负期望→1；无盈利目标→1）与连亏到破产笔数。",
    inputSchema: {
      type: "object",
      properties: {
        winRate: { type: "number", description: "胜率 %（如 55 = 55%）∈ [0,100]", minimum: 0, maximum: 100 },
        rr: { type: "number", description: "盈亏比 R:R ≥ 0", minimum: 0 },
        bankrollR: { type: "number", description: "以 R 计的资本 > 0", exclusiveMinimum: 0 },
      },
      required: ["winRate", "rr", "bankrollR"],
      additionalProperties: false,
    },
    run: (a) => ruinSummary(a),
  },
  {
    name: "risk_budget",
    title: "风险预算 / 风险头寸数",
    category: "risk",
    description:
      "给定账户、风险 %、每单位 VaR 损失、现价、策略数，反推「以账户风险为上限能开几个风险头寸」及每笔风险。",
    inputSchema: {
      type: "object",
      properties: {
        account: { type: "number", description: "账户权益 ≥ 0", minimum: 0 },
        riskPct: { type: "number", description: "每笔风险 % ∈ [0,100]", minimum: 0, maximum: 100 },
        varPerUnit: { type: "number", description: "每单位 VaR 损失 > 0", exclusiveMinimum: 0 },
        price: { type: "number", description: "现价 > 0", exclusiveMinimum: 0 },
        numStrategies: { type: "integer", description: "并行策略数，默认 1", minimum: 1 },
      },
      required: ["account", "riskPct", "varPerUnit", "price"],
      additionalProperties: false,
    },
    run: (a) => riskBudgetSummary(a),
  },
  {
    name: "drawdown_sizing",
    title: "回撤约束头寸规模",
    category: "risk",
    description:
      "给定账户、目标最大回撤、策略实测回撤/收益/波动率与交易笔数，反推使组合回撤落在目标内的头寸比例并评估 Sharpe。",
    inputSchema: {
      type: "object",
      properties: {
        account: { type: "number", description: "账户权益 ≥ 0", minimum: 0 },
        targetDD: { type: "number", description: "目标最大回撤 % ∈ [0,100]", minimum: 0, maximum: 100 },
        strategyDD: { type: "number", description: "策略实测最大回撤 % ∈ [0,100]", minimum: 0, maximum: 100 },
        stratReturn: { type: "number", description: "策略年化收益率 %", minimum: 0 },
        stratVol: { type: "number", description: "策略年化波动率 %，默认 0", minimum: 0 },
        numTrades: { type: "integer", description: "交易笔数（用于置信），默认 0", minimum: 0 },
      },
      required: ["account", "targetDD", "strategyDD", "stratReturn"],
      additionalProperties: false,
    },
    run: (a) => ddSizingSummary(a),
  },
  {
    name: "leverage",
    title: "杠杆与强平风险",
    category: "risk",
    description:
      "给定杠杆倍数（可选账户/入场/价格变动/方向/维持保证金），计算强平所需价格变动、权益变动 %、强平价与风险分级。",
    inputSchema: {
      type: "object",
      properties: {
        leverage: { type: "number", description: "杠杆倍数 > 0", exclusiveMinimum: 0 },
        account: { type: "number", description: "账户权益 ≥ 0（可选）", minimum: 0 },
        entry: { type: "number", description: "入场价 > 0（可选，用于强平价）", exclusiveMinimum: 0 },
        movePct: { type: "number", description: "价格变动 %（正=涨，可选）" },
        side: { type: "string", enum: ["long", "short"], description: "方向，默认 long" },
        mmPct: { type: "number", description: "维持保证金率 %，默认 0", minimum: 0, maximum: 100 },
      },
      required: ["leverage"],
      additionalProperties: false,
    },
    run: (a) => leverageRun(a),
  },
  {
    name: "expectancy",
    title: "交易期望 / 盈亏因子",
    category: "risk",
    description:
      "评估策略是否正期望：每笔期望 EV=p·avgWin−(1−p)·avgLoss、盈亏比 RR=avgWin/avgLoss、盈亏因子 PF、平衡胜率 p*=avgLoss/(avgWin+avgLoss)、总期望=EV×trades。winRate 为小数[0,1]。",
    inputSchema: {
      type: "object",
      properties: {
        winRate: { type: "number", description: "胜率 p，小数[0,1]（0.5=50%）", minimum: 0, maximum: 1 },
        avgWin: { type: "number", description: "平均盈利（金额或点数）>0", exclusiveMinimum: 0 },
        avgLoss: { type: "number", description: "平均亏损（金额或点数，正数）>0", exclusiveMinimum: 0 },
        trades: { type: "integer", description: "交易笔数，默认 100", minimum: 0 },
      },
      required: ["winRate", "avgWin", "avgLoss"],
      additionalProperties: false,
    },
    run: (a) => expectancySummary(a),
  },
  {
    name: "breakeven",
    title: "含费盈亏平衡价",
    category: "risk",
    description:
      "含手续费的盈亏平衡价与有效盈亏比：多头平衡价=entry·(1+fee)/(1−fee)、空头=entry·(1−fee)/(1+fee)；给扣双边手续费后的有效 R:R。feePct 为单边费率百分数（0.1=0.1%）。",
    inputSchema: {
      type: "object",
      properties: {
        side: { type: "string", enum: ["long", "short"], description: "方向，默认 long" },
        entry: { type: "number", description: "入场价 >0", exclusiveMinimum: 0 },
        stop: { type: "number", description: "止损价（可选，用于有效 R:R）" },
        target: { type: "number", description: "止盈价（可选，用于有效 R:R）" },
        feePct: { type: "number", description: "单边手续费率百分数[0,100)（0.1=0.1%）", minimum: 0, exclusiveMaximum: 100 },
      },
      required: ["entry"],
      additionalProperties: false,
    },
    run: (a) => breakevenSummary(a),
  },
  {
    name: "r_multiple",
    title: "R-multiple 头寸管理",
    category: "risk",
    description:
      "按 R-multiple 头寸管理：风险金额=account·riskPct、预期盈利=风险金额·R、最大亏损=风险金额、每笔期望=winRate·盈利−(1−winRate)·亏损。riskPct 为小数（0.01=1%）、winRate 为小数[0,1]。",
    inputSchema: {
      type: "object",
      properties: {
        account: { type: "number", description: "账户权益 >0", exclusiveMinimum: 0 },
        riskPct: { type: "number", description: "每笔风险占账户比，小数（0.01=1%）", exclusiveMinimum: 0 },
        rMultiple: { type: "number", description: "目标 R-multiple >0", exclusiveMinimum: 0 },
        winRate: { type: "number", description: "胜率，小数[0,1]（默认 0.5）", minimum: 0, maximum: 1 },
      },
      required: ["account", "riskPct", "rMultiple"],
      additionalProperties: false,
    },
    run: (a) => rPositionSummary(a),
  },
  {
    name: "margin",
    title: "杠杆融资成本",
    category: "leverage",
    description:
      "杠杆融资/保证金利息：借入=P·(L−1)、头寸价值=P·L、融资成本=借入·年利率·(天/365)、占本金比=成本/P。annualInterest 为年利率小数（0.08=8%）。",
    inputSchema: {
      type: "object",
      properties: {
        principal: { type: "number", description: "本金 >0", exclusiveMinimum: 0 },
        leverage: { type: "number", description: "杠杆倍数 ≥1", minimum: 1 },
        annualInterest: { type: "number", description: "年利率，小数（0.08=8%），默认 0", minimum: 0 },
        days: { type: "integer", description: "持有天数，默认 0", minimum: 0 },
      },
      required: ["principal", "leverage"],
      additionalProperties: false,
    },
    run: (a) => marginSummary(a),
  },
  {
    name: "funding_rate",
    title: "永续资金费率成本",
    category: "crypto",
    description:
      "永续合约资金费率成本：单期成本=名义本金·费率、N 期总成本=名义·费率·N、年化费率=单期·每年期数（默认 3×365=1095）。费率可负（持有方收资金费）。fundingRatePct 为百分数（0.01=0.01%/期）。",
    inputSchema: {
      type: "object",
      properties: {
        notional: { type: "number", description: "名义本金 ≥0", minimum: 0 },
        fundingRatePct: { type: "number", description: "单期资金费率百分数（0.01=0.01%；可负）" },
        days: { type: "integer", description: "持有天数 ≥0", minimum: 0 },
        periodsPerDay: { type: "integer", description: "每天期数（默认 3，即每 8h）", minimum: 1 },
      },
      required: ["notional", "fundingRatePct", "days"],
      additionalProperties: false,
    },
    run: (a) => fundingSummary(a),
  },
  {
    name: "npv",
    title: "净现值 NPV",
    category: "finance",
    description:
      "净现值 NPV=Σ CF_t/(1+r)^t（t 从 0 起，CF_0 常为负值首期流出）+ 折现因子 + 投资回收率 PIR=Σ正CF/Σ|负CF| + 分级。rate 为折现率小数（0.1=10%）。",
    inputSchema: {
      type: "object",
      properties: {
        rate: { type: "number", description: "折现率，小数（0.1=10%）" },
        cashflows: { type: "array", items: { type: "number" }, description: "现金流序列，长度≥2（CF_0 常为负）", minItems: 2 },
      },
      required: ["rate", "cashflows"],
      additionalProperties: false,
    },
    run: (a) => npvSummary(a),
  },
];

/** 按名取工具定义（内部，含 run）。 */
export function getTool(name) {
  return TOOLS.find((t) => t.name === name);
}

/** 仅暴露给客户端的公开定义（去掉 run 等内部字段），确定性顺序。 */
export function listToolDefs() {
  return TOOLS.map(({ name, title, description, category, inputSchema }) => ({
    name,
    title,
    description,
    category,
    inputSchema,
  }));
}

function round(n) {
  return Math.round(n * 1e6) / 1e6;
}

// 把结构化结果压成一段可读文本（给 LLM/人类），保留主要标量字段。
function summarize(tool, result) {
  const keys = Object.entries(result)
    .filter(([, v]) => typeof v === "number" || (typeof v === "string" && v !== "valid"))
    .slice(0, 10)
    .map(([k, v]) => (typeof v === "number" ? `${k}=${round(v)}` : `${k}=${v}`));
  return `${tool.name} → ${keys.join(", ")}`;
}

/**
 * 调用一个 MCP 工具。
 * @param {string} name 工具名
 * @param {object} [args] 入参
 * @returns {{content:Array, structuredContent:object, isError:boolean}}
 */
export function callTool(name, args = {}) {
  const tool = getTool(name);
  if (!tool) {
    return {
      content: [{ type: "text", text: `未知工具: ${name}` }],
      structuredContent: { ok: false, error: "unknown_tool", tool: name, available: TOOLS.map((t) => t.name) },
      isError: true,
    };
  }
  const { valid, errors } = validateSchema(tool.inputSchema, args || {});
  if (!valid) {
    return {
      content: [{ type: "text", text: `入参非法: ${errors.join("; ")}` }],
      structuredContent: { ok: false, error: "invalid_args", tool: name, errors },
      isError: true,
    };
  }
  let result;
  try {
    result = tool.run(args);
  } catch (e) {
    return {
      content: [{ type: "text", text: `工具运行错误: ${e && e.message ? e.message : e}` }],
      structuredContent: { ok: false, error: "runtime", tool: name, message: e && e.message },
      isError: true,
    };
  }
  if (result && result.valid === false) {
    return {
      content: [{ type: "text", text: `计算未通过校验: ${result.reason || "invalid input"}` }],
      structuredContent: result,
      isError: true,
    };
  }
  return {
    content: [{ type: "text", text: summarize(tool, result) }],
    structuredContent: result,
    isError: false,
  };
}
