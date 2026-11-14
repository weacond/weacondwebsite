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
import { slippageSummary } from "../slippage.js";
import { takeProfitSummary } from "../takeProfit.js";
import { trailingStopSummary } from "../trailingStop.js";
import { annuitySummary } from "../annuity.js";
import { ytmSummary } from "../ytm.js";
import { payoffSummary } from "../optionsPayoff.js";
import { fireSummary } from "../fire.js";
import { twrrSummary } from "../twrr.js";
import { fxSummary } from "../fxPip.js";
import { fxCrossSummary } from "../fxCross.js";
import { interestParitySummary } from "../interestParity.js";
import { rebalanceSummary } from "../rebalance.js";
import { betaSummary } from "../portfolioBeta.js";
import { realAfterTaxSummary } from "../realAfterTax.js";
import { realReturnSummary } from "../realReturn.js";
import { taxDragSummary } from "../taxDrag.js";
import { probReturnSummary } from "../probReturn.js";
import { loanSummary } from "../loan.js";
import { earSummary } from "../ear.js";
import { dripSummary } from "../drip.js";
import { varSummary } from "../var.js";
import { realEstateSummary } from "../realEstate.js";
import { continuousSummary } from "../continuousCompound.js";
import { leveredEtfSummary } from "../leveredEtf.js";
import { goalSolverSummary } from "../goalSolver.js";
import { inflationGoalSummary } from "../inflationGoal.js";
import { harvestSummary } from "../taxLoss.js";
import { fairValueSummary } from "../fairValue.js";
import { stakeSummary } from "../staking.js";
import { lotSizeSummary } from "../lotSize.js";
import { positionSummary } from "../avgEntry.js";
import { barrierSummary } from "../barrier.js";
import { bondSummary } from "../bond.js";
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
  {
    name: "slippage",
    title: "Slippage & Transaction Cost",
    description:
      "Estimate round-trip transaction cost (spread + 2× per-leg slippage) as a fraction of notional and the net return after costs. price/spread/slippage in price units; grossReturn a fraction (0.05 = 5%); costPct/netReturn are fractions.",
    category: "execution",
    inputSchema: {
      type: "object",
      properties: {
        price: { type: "number", description: "Unit price.", minimum: 0 },
        spread: { type: "number", description: "Bid/ask spread in price units.", minimum: 0 },
        slippage: { type: "number", description: "Per-leg slippage in price units.", minimum: 0 },
        grossReturn: { type: "number", description: "Gross return, fraction (0.05 = 5%)." },
      },
      required: ["price"],
      additionalProperties: false,
    },
    run: (a) => slippageSummary(a),
  },
  {
    name: "take_profit",
    title: "Take-Profit / R:R Target",
    description:
      "Compute the take-profit price for a target R-multiple from entry/stop, plus reward per unit and R:R band. Long: entry > stop; short: entry < stop. targetR dimensionless (2 = 2R).",
    category: "position",
    inputSchema: {
      type: "object",
      properties: {
        entry: { type: "number", description: "Entry price." },
        stop: { type: "number", description: "Stop-loss price." },
        targetR: { type: "number", description: "Target R-multiple, e.g. 2 = 2R.", minimum: 0 },
        side: { type: "string", enum: ["long", "short"], description: "Position side, default long." },
      },
      required: ["entry", "stop", "targetR"],
      additionalProperties: false,
    },
    run: (a) => takeProfitSummary(a),
  },
  {
    name: "trailing_stop",
    title: "Trailing / Break-Even Stop",
    description:
      "Compute the trailing stop level, achieved R, break-even trigger, and lock-in R from entry/stop/current price. Long: entry > stop; short: entry < stop. trailDistance in price units; triggerR default 1.",
    category: "position",
    inputSchema: {
      type: "object",
      properties: {
        entry: { type: "number", description: "Entry price." },
        stop: { type: "number", description: "Initial stop-loss price." },
        price: { type: "number", description: "Current price.", minimum: 0 },
        trailDistance: { type: "number", description: "Trail distance in price units.", minimum: 0 },
        side: { type: "string", enum: ["long", "short"], description: "Position side, default long." },
        triggerR: { type: "number", description: "Break-even trigger R, default 1.", minimum: 0 },
      },
      required: ["entry", "stop", "price"],
      additionalProperties: false,
    },
    run: (a) => trailingStopSummary(a),
  },
  {
    name: "annuity",
    title: "Annuity Payment & Sufficiency",
    description:
      "Compute the level annual payment that fully amortizes a present value over a term, plus total paid and interest portion. rate is a fraction (0.04 = 4%).",
    category: "investment",
    inputSchema: {
      type: "object",
      properties: {
        presentValue: { type: "number", description: "Present value (lump sum).", minimum: 0 },
        rate: { type: "number", description: "Annual rate, fraction (0.04 = 4%)." },
        years: { type: "number", description: "Term in years.", minimum: 0 },
      },
      required: ["presentValue", "rate", "years"],
      additionalProperties: false,
    },
    run: (a) => annuitySummary(a),
  },
  {
    name: "yield_to_maturity",
    title: "Bond Yield to Maturity",
    description:
      "Compute the annualized yield to maturity for a bond from face value, coupon rate, market price and years to maturity. couponRate a fraction (0.05 = 5%); returns YTM, band and a fair (price ≈ face) flag.",
    category: "investment",
    inputSchema: {
      type: "object",
      properties: {
        face: { type: "number", description: "Face value.", minimum: 0 },
        couponRate: { type: "number", description: "Coupon rate, fraction (0.05 = 5%).", minimum: 0 },
        price: { type: "number", description: "Market price.", minimum: 0 },
        years: { type: "number", description: "Years to maturity.", minimum: 0 },
      },
      required: ["face", "couponRate", "price", "years"],
      additionalProperties: false,
    },
    run: (a) => ytmSummary(a),
  },
  {
    name: "option_payoff",
    title: "Options Payoff / Break-Even",
    description:
      "Compute single-leg options payoff at expiry, break-even point, max loss/profit and current payoff. type call/put; side long/short. Returns intrinsic, breakEven, maxLoss, maxProfit, currentPayoff, atTheMoney.",
    category: "derivatives",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["call", "put"], description: "Option type, default call." },
        side: { type: "string", enum: ["long", "short"], description: "Position side, default long." },
        spot: { type: "number", description: "Current underlying price.", minimum: 0 },
        strike: { type: "number", description: "Strike price.", minimum: 0 },
        premium: { type: "number", description: "Premium paid/received.", minimum: 0 },
      },
      required: ["spot", "strike", "premium"],
      additionalProperties: false,
    },
    run: (a) => payoffSummary(a),
  },
  {
    name: "fire",
    title: "FIRE / Retire-Savings Target",
    description:
      "Compute the FIRE (financial independence) target = annual expense / safe withdrawal rate, plus annual savings and estimated years to FIRE. Rates as fractions (0.04 = 4%).",
    category: "planning",
    inputSchema: {
      type: "object",
      properties: {
        annualExpense: { type: "number", description: "Annual spending needed in retirement.", minimum: 0 },
        safeWithdrawalRate: { type: "number", description: "Safe withdrawal rate, fraction (0.04 = 4% rule)." },
        currentSavings: { type: "number", description: "Current savings balance.", minimum: 0 },
        savingsRate: { type: "number", description: "Fraction of income saved, e.g. 0.25 = 25%." },
        realGrowth: { type: "number", description: "Real (inflation-adjusted) annual growth, fraction." },
      },
      required: ["annualExpense", "safeWithdrawalRate"],
      additionalProperties: false,
    },
    run: (a) => fireSummary(a),
  },
  {
    name: "time_weighted_return",
    title: "Time-Weighted Return (TWRR)",
    description:
      "Compute the time-weighted return plus annualized TWRR, growth multiple and volatility drag from a sequence of per-period returns. returns is a comma-separated string of fractions (e.g. '0.05,-0.02,0.03'); periodsPerYear e.g. 12 for monthly, 252 for daily.",
    category: "performance",
    inputSchema: {
      type: "object",
      properties: {
        returns: { type: "string", description: "Comma-separated per-period returns as fractions, e.g. '0.01,0.02,-0.03'." },
        periodsPerYear: { type: "number", description: "Periods per year for annualization (12=monthly, 252=daily).", minimum: 1 },
      },
      required: ["returns", "periodsPerYear"],
      additionalProperties: false,
    },
    run: (a) => twrrSummary(a),
  },
  {
    name: "fx_pip",
    title: "FX Pip Value / Pip Percent",
    description:
      "Compute the value of one pip and the percent move for a forex position from pip size, position size and the exchange rate. Returns pip value, pip percent, and lots (position / 100000).",
    category: "fx",
    inputSchema: {
      type: "object",
      properties: {
        pipSize: { type: "number", description: "Pip size (e.g. 0.0001 for most pairs).", minimum: 0 },
        positionSize: { type: "number", description: "Position size in units.", minimum: 0 },
        rate: { type: "number", description: "Exchange rate.", minimum: 0 },
        pips: { type: "number", description: "Number of pips to price." },
      },
      required: ["pipSize", "positionSize", "rate"],
      additionalProperties: false,
    },
    run: (a) => fxSummary(a),
  },
  {
    name: "fx_cross",
    title: "FX Cross-Rate Conversion",
    description:
      "Compute a cross rate from two rates against a common currency, convert an amount at that cross rate, its inverse, and the pip value of a notional. Rates are quoted as unit prices.",
    category: "fx",
    inputSchema: {
      type: "object",
      properties: {
        rateAB: { type: "number", description: "Rate A→B.", minimum: 0 },
        rateBC: { type: "number", description: "Rate B→C.", minimum: 0 },
        amount: { type: "number", description: "Amount to convert.", minimum: 0 },
        pipSize: { type: "number", description: "Pip size (e.g. 0.0001).", minimum: 0 },
        notional: { type: "number", description: "Notional for pip value.", minimum: 0 },
      },
      required: ["rateAB", "rateBC", "amount", "pipSize", "notional"],
      additionalProperties: false,
    },
    run: (a) => fxCrossSummary(a),
  },
  {
    name: "interest_parity",
    title: "Covered Interest Parity (Forward)",
    description:
      "Compute the theoretical forward FX rate from spot and domestic/foreign interest rates plus the forward premium. Rates are PERCENTS (4 = 4%). If a marketForward is given, returns the parity mispricing.",
    category: "fx",
    inputSchema: {
      type: "object",
      properties: {
        spot: { type: "number", description: "Spot FX rate.", minimum: 0 },
        domRatePct: { type: "number", description: "Domestic annual rate, percent (4 = 4%)." },
        forRatePct: { type: "number", description: "Foreign annual rate, percent (4 = 4%)." },
        years: { type: "number", description: "Time to maturity in years.", minimum: 0 },
        marketForward: { type: "number", description: "Optional market forward to test mispricing." },
      },
      required: ["spot", "domRatePct", "forRatePct", "years"],
      additionalProperties: false,
    },
    run: (a) => interestParitySummary(a),
  },
  {
    name: "rebalance",
    title: "Rebalancing Bonus (Two-Asset)",
    description:
      "Estimate the rebalancing bonus (Grinold–Kahn premium) of periodically rebalancing a two-asset portfolio versus buy-and-hold, plus the static portfolio volatility. Weights and volatilities are FRACTIONS (0.2 = 20%); correlation is in [-1, 1]. Returns annual + N-year bonus and a severity band.",
    category: "investment",
    inputSchema: {
      type: "object",
      properties: {
        w1: { type: "number", description: "Weight of asset 1 as a fraction (0–1).", minimum: 0, maximum: 1 },
        s1: { type: "number", description: "Annual volatility of asset 1 as a fraction (0.2 = 20%).", minimum: 0 },
        s2: { type: "number", description: "Annual volatility of asset 2 as a fraction (0.1 = 10%).", minimum: 0 },
        rho: { type: "number", description: "Correlation between the two assets, in [-1, 1].", minimum: -1, maximum: 1 },
        years: { type: "number", description: "Horizon in years for the cumulative bonus.", minimum: 0 },
      },
      required: ["w1", "s1", "s2", "rho"],
      additionalProperties: false,
    },
    run: (a) => rebalanceSummary(a),
  },
  {
    name: "beta",
    title: "Portfolio Beta / Systematic Risk",
    description:
      "Compute a portfolio's beta (weighted average of per-asset betas, weights normalized to sum 1), the systematic return for a given market return, and the residual (idiosyncratic) volatility. Market return/vol are FRACTIONS (0.1 = 10%). Returns beta, systematic return, residual vol, and a risk band.",
    category: "risk",
    inputSchema: {
      type: "object",
      properties: {
        weights: { type: "array", items: { type: "number" }, minItems: 1, description: "Per-asset weights (normalized to sum 1 internally)." },
        betas: { type: "array", items: { type: "number" }, minItems: 1, description: "Per-asset betas (same length as weights)." },
        marketReturn: { type: "number", description: "Market return as a fraction (0.1 = 10%); default 0.1." },
        marketVol: { type: "number", description: "Market volatility as a fraction (0.15 = 15%); default 0.15.", minimum: 0 },
      },
      required: ["weights", "betas"],
      additionalProperties: false,
    },
    run: (a) => betaSummary(a),
  },
  {
    name: "real_after_tax",
    title: "Real After-Tax Compounding",
    description:
      "Compound a present value to a real, after-tax future value: nominal FV × (1 − taxRate) ÷ (1 + inflation)^years. Rates are FRACTIONS (rate 0.08 = 8%, taxRate 0.15 = 15%, inflation 0.03 = 3%). Returns nominal / after-tax / real FV, total drag, after-tax real rate, and a band.",
    category: "planning",
    inputSchema: {
      type: "object",
      properties: {
        pv: { type: "number", description: "Present value / principal.", minimum: 0 },
        rate: { type: "number", description: "Nominal annual return as a fraction (0.08 = 8%)." },
        taxRate: { type: "number", description: "Annual tax rate as a fraction (0.15 = 15%); default 0.15.", minimum: 0, maximum: 1 },
        inflation: { type: "number", description: "Inflation as a fraction (0.03 = 3%); default 0.03.", minimum: 0 },
        years: { type: "number", description: "Investment horizon in years (must be positive).", exclusiveMinimum: 0 },
      },
      required: ["pv", "rate", "years"],
      additionalProperties: false,
    },
    run: (a) => realAfterTaxSummary(a),
  },
  {
    name: "real_return",
    title: "Real (Inflation-Adjusted) Return",
    description:
      "Convert a nominal return to a real (inflation-adjusted) rate via the Fisher equation, plus Bogle's magic number, purchasing-power decay, and future nominal/real value. Rates are FRACTIONS (nominal 0.08 = 8%, inflation 0.03 = 3%).",
    category: "planning",
    inputSchema: {
      type: "object",
      properties: {
        nominal: { type: "number", description: "Nominal annual return as a fraction (0.08 = 8%)." },
        inflation: { type: "number", description: "Inflation as a fraction (0.03 = 3%)." },
        years: { type: "number", description: "Horizon in years.", minimum: 0 },
        principal: { type: "number", description: "Principal (default 1000).", minimum: 0 },
      },
      required: ["nominal", "inflation", "years"],
      additionalProperties: false,
    },
    run: (a) => realReturnSummary(a),
  },
  {
    name: "tax_drag",
    title: "After-Tax Compounding / Tax Drag",
    description:
      "Compute nominal vs after-tax future value and the tax drag ((FV_nom − FV_tax) / FV_nom) from an annual rate, tax rate and horizon. After-tax annual rate = rate × (1 − taxRate). Rates are FRACTIONS (rate 0.1 = 10%, taxRate 0.15 = 15%).",
    category: "planning",
    inputSchema: {
      type: "object",
      properties: {
        principal: { type: "number", description: "Principal.", minimum: 0 },
        rate: { type: "number", description: "Nominal annual return as a fraction (0.1 = 10%)." },
        taxRate: { type: "number", description: "Annual tax rate as a fraction (0.15 = 15%).", minimum: 0, maximum: 1 },
        years: { type: "number", description: "Horizon in years.", minimum: 0 },
      },
      required: ["principal", "rate", "taxRate", "years"],
      additionalProperties: false,
    },
    run: (a) => taxDragSummary(a),
  },
  {
    name: "prob_return",
    title: "Probability-Weighted Expected Return",
    description:
      "Compute the expected value, variance, standard deviation and coefficient of variation of a probability distribution over outcomes. Probs must sum to ~1 and share outcomes' length. Returns expected return and a band.",
    category: "risk",
    inputSchema: {
      type: "object",
      properties: {
        probs: { type: "array", items: { type: "number", minimum: 0, maximum: 1 }, minItems: 2, description: "Outcome probabilities (must sum to ~1, length ≥ 2)." },
        outcomes: { type: "array", items: { type: "number" }, minItems: 2, description: "Outcome payoffs (same length as probs)." },
      },
      required: ["probs", "outcomes"],
      additionalProperties: false,
    },
    run: (a) => probReturnSummary(a),
  },
  {
    name: "loan",
    title: "Loan / Debt Amortization",
    description:
      "Compute the equal monthly payment (PMT) for a loan, total paid, total interest and the interest ratio. r = annualRate/12, n = years×12. annualRate is a FRACTION (0.12 = 12%). Returns monthly payment, total paid/interest, and a payoff-speed band.",
    category: "planning",
    inputSchema: {
      type: "object",
      properties: {
        principal: { type: "number", description: "Loan principal.", minimum: 0 },
        annualRate: { type: "number", description: "Annual interest rate as a fraction (0.12 = 12%)." },
        years: { type: "number", description: "Term in years (payments = years × 12).", exclusiveMinimum: 0 },
      },
      required: ["principal", "annualRate", "years"],
      additionalProperties: false,
    },
    run: (a) => loanSummary(a),
  },
  {
    name: "ear",
    title: "Effective Annual Rate (EAR / APY)",
    description:
      "Convert a nominal annual rate to an effective annual rate (EAR = (1 + r/m)^m − 1), the continuous-compounding rate (e^r − 1), and the compounding gap between them. nominal is a FRACTION (0.12 = 12%); periods is the compounding frequency per year.",
    category: "finance",
    inputSchema: {
      type: "object",
      properties: {
        nominal: { type: "number", description: "Nominal annual rate as a fraction (0.12 = 12%)." },
        periods: { type: "number", description: "Compounding periods per year (1=annual, 12=monthly).", minimum: 1 },
      },
      required: ["nominal", "periods"],
      additionalProperties: false,
    },
    run: (a) => earSummary(a),
  },
  {
    name: "drip",
    title: "Dividend Reinvestment / Total Income",
    description:
      "Compute cumulative dividends from a principal at a given yield and growth rate over N years (geometric series), plus the first/last year dividend and the income multiplier. Rates are FRACTIONS (yield 0.04 = 4%, growth 0.05 = 5%).",
    category: "investment",
    inputSchema: {
      type: "object",
      properties: {
        principal: { type: "number", description: "Principal invested.", minimum: 0 },
        yieldRate: { type: "number", description: "Annual dividend yield as a fraction (0.04 = 4%).", minimum: 0 },
        growthRate: { type: "number", description: "Annual dividend growth rate as a fraction (0.05 = 5%)." },
        years: { type: "number", description: "Holding period in years.", exclusiveMinimum: 0 },
      },
      required: ["principal", "yieldRate", "growthRate", "years"],
      additionalProperties: false,
    },
    run: (a) => dripSummary(a),
  },
  {
    name: "continuous",
    title: "Continuous Compounding",
    description:
      "Compute continuous compounding: future value FV = P·e^(r·t), the multiplier e^(r·t), the period effective rate and the continuous EAR (e^r − 1). annualRate is a FRACTION (0.08 = 8%).",
    category: "finance",
    inputSchema: {
      type: "object",
      properties: {
        principal: { type: "number", description: "Principal invested.", minimum: 0 },
        annualRate: { type: "number", description: "Annual rate as a fraction (0.08 = 8%)." },
        years: { type: "number", description: "Time in years.", exclusiveMinimum: 0 },
      },
      required: ["principal", "annualRate", "years"],
      additionalProperties: false,
    },
    run: (a) => continuousSummary(a),
  },
  {
    name: "leveredEtf",
    title: "Leveraged ETF Decay / Volatility Drag",
    description:
      "Estimate a daily-rebalanced L× leveraged ETF's annual return L·μ − ½·L·(L−1)·σ², the volatility-drag term, and the resulting decay loss vs the unlevered underlying. mu/sigma are FRACTIONS (0.08 = 8%, 0.20 = 20%).",
    category: "risk",
    inputSchema: {
      type: "object",
      properties: {
        leverage: { type: "number", description: "Leverage L (2 for 2× long, -1 for inverse)." },
        mu: { type: "number", description: "Underlying annual expected return as a fraction (0.08 = 8%)." },
        sigma: { type: "number", description: "Underlying annual volatility as a fraction (0.20 = 20%).", minimum: 0 },
        years: { type: "number", description: "Holding period in years.", minimum: 0 },
        principal: { type: "number", description: "Amount invested.", exclusiveMinimum: 0 },
      },
      required: ["leverage", "mu", "sigma", "years", "principal"],
      additionalProperties: false,
    },
    run: (a) => leveredEtfSummary(a),
  },
  {
    name: "goalSolver",
    title: "Goal-Based Savings (Compound Inverse)",
    description:
      "Solve backwards from a target future value: the required annual rate, required years, and required periodic contribution to grow a present value to the goal. rate is a FRACTION (0.05 = 5%).",
    category: "planning",
    inputSchema: {
      type: "object",
      properties: {
        pv: { type: "number", description: "Present value / starting balance.", minimum: 0 },
        fv: { type: "number", description: "Target future value (the goal).", exclusiveMinimum: 0 },
        years: { type: "number", description: "Time horizon in years.", exclusiveMinimum: 0 },
        rate: { type: "number", description: "Assumed annual return as a fraction (0.05 = 5%)." },
      },
      required: ["pv", "fv", "years", "rate"],
      additionalProperties: false,
    },
    run: (a) => goalSolverSummary(a),
  },
  {
    name: "inflationGoal",
    title: "Inflation-Adjusted Savings Goal",
    description:
      "Compute the nominal and real future value of a principal plus monthly contributions, and the monthly amount required to reach a real (inflation-adjusted) goal. annualRate/inflation are FRACTIONS (0.07 = 7%, 0.025 = 2.5%).",
    category: "investment",
    inputSchema: {
      type: "object",
      properties: {
        principal: { type: "number", description: "Starting principal.", minimum: 0 },
        monthly: { type: "number", description: "Planned monthly contribution." },
        annualRate: { type: "number", description: "Nominal annual return as a fraction (0.07 = 7%)." },
        inflation: { type: "number", description: "Annual inflation rate as a fraction (0.025 = 2.5%)." },
        years: { type: "number", description: "Time horizon in years.", exclusiveMinimum: 0 },
        realGoal: { type: "number", description: "Real (inflation-adjusted) target amount.", minimum: 0 },
      },
      required: ["principal", "monthly", "annualRate", "inflation", "years", "realGoal"],
      additionalProperties: false,
    },
    run: (a) => inflationGoalSummary(a),
  },
  {
    name: "taxLoss",
    title: "Tax-Loss Harvesting",
    description:
      "Compute the tax savings from harvesting losses, the after-tax net cost, and the carryforward years needed to offset all losses. taxRate is a FRACTION (0.3 = 30%); cap <= 0 means an unlimited annual offset.",
    category: "planning",
    inputSchema: {
      type: "object",
      properties: {
        loss: { type: "number", description: "Total capital loss to harvest.", exclusiveMinimum: 0 },
        taxRate: { type: "number", description: "Marginal tax rate as a fraction (0.3 = 30%)." },
        cap: { type: "number", description: "Annual deductible offset cap (<= 0 = unlimited)." },
      },
      required: ["loss", "taxRate", "cap"],
      additionalProperties: false,
    },
    run: (a) => harvestSummary(a),
  },
  {
    name: "fairValue",
    title: "Fair Value / Margin of Safety",
    description:
      "Estimate intrinsic value by P/E reversion (FV = EPS × target P/E) and the Gordon/DDM model D₀(1+g)/(r−g), plus Graham's margin of safety and upside vs the current price. price is in currency; g/r are FRACTIONS.",
    category: "investment",
    inputSchema: {
      type: "object",
      properties: {
        price: { type: "number", description: "Current market price.", exclusiveMinimum: 0 },
        eps: { type: "number", description: "Earnings per share." },
        targetPE: { type: "number", description: "Target P/E multiple." },
        d0: { type: "number", description: "Current dividend (for DDM)." },
        g: { type: "number", description: "Dividend growth rate as a fraction (0.03 = 3%)." },
        r: { type: "number", description: "Required return / discount rate as a fraction (0.08 = 8%)." },
      },
      required: ["price", "eps", "targetPE"],
      additionalProperties: false,
    },
    run: (a) => fairValueSummary(a),
  },
  {
    name: "staking",
    title: "Crypto Staking Yield / Inflation Erosion",
    description:
      "Compute total staking reward P·((1+apy)^n − 1), the inflation-adjusted net yield (apy − inflation), the inflation-eroded terminal value, and the annual reward. apy/inflationRate are FRACTIONS (0.04 = 4%).",
    category: "finance",
    inputSchema: {
      type: "object",
      properties: {
        principal: { type: "number", description: "Amount staked.", exclusiveMinimum: 0 },
        apy: { type: "number", description: "Staking APY as a fraction (0.04 = 4%)." },
        inflationRate: { type: "number", description: "Token inflation rate as a fraction (0.02 = 2%)." },
        years: { type: "number", description: "Staking duration in years.", minimum: 0 },
      },
      required: ["principal", "apy", "inflationRate", "years"],
      additionalProperties: false,
    },
    run: (a) => stakeSummary(a),
  },
  {
    name: "lotSize",
    title: "Position Sizing / Lot & Margin",
    description:
      "Size a position from a risk budget: risk amount = account × riskPct, risk per lot = |price − stop| × multiplier, units = riskAmount / riskPerLot, then notional, required margin (notional / leverage) and account exposure. riskPct is a FRACTION (0.01 = 1%).",
    category: "risk",
    inputSchema: {
      type: "object",
      properties: {
        account: { type: "number", description: "Account balance.", exclusiveMinimum: 0 },
        riskPct: { type: "number", description: "Risk per trade as a fraction of account (0.01 = 1%)." },
        price: { type: "number", description: "Entry price." },
        stop: { type: "number", description: "Stop-loss price." },
        multiplier: { type: "number", description: "Contract multiplier (default 1)." },
        leverage: { type: "number", description: "Leverage (default 1)." },
      },
      required: ["account", "riskPct", "price", "stop"],
      additionalProperties: false,
    },
    run: (a) => lotSizeSummary(a),
  },
  {
    name: "avgEntry",
    title: "Average Entry & Position P&L",
    description:
      "Blend an existing position with an add-on to get the weighted-average entry price, current P&L vs the average, and the distance to a target price. Returns nested {blended, pnl, toTarget} objects.",
    category: "strategy",
    inputSchema: {
      type: "object",
      properties: {
        existingShares: { type: "number", description: "Existing shares/units.", minimum: 0 },
        existingPrice: { type: "number", description: "Existing entry price.", minimum: 0 },
        addShares: { type: "number", description: "Shares/units to add (0 = no add).", minimum: 0 },
        addPrice: { type: "number", description: "Price of the add-on." },
        current: { type: "number", description: "Current price (defaults to addPrice)." },
        target: { type: "number", description: "Target price for distance." },
      },
      required: ["existingShares", "existingPrice", "addShares", "addPrice"],
      additionalProperties: false,
    },
    run: (a) => positionSummary(a),
  },
  {
    name: "barrier",
    title: "Two-Barrier Hit Probability",
    description:
      "Estimate the probability a price hits the target before the stop (gambler's-ruin / two-barrier model): with zero drift P = stop/(target+stop); with per-step drift λ, P = (1 − e^(−2λ·stop)) / (1 − e^(−2λ·(target+stop))).",
    category: "risk",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "number", description: "Distance to the target (above).", exclusiveMinimum: 0 },
        stop: { type: "number", description: "Distance to the stop (below).", exclusiveMinimum: 0 },
        drift: { type: "number", description: "Per-step drift λ (default 0 = symmetric)." },
      },
      required: ["target", "stop"],
      additionalProperties: false,
    },
    run: (a) => barrierSummary(a),
  },
  {
    name: "bond",
    title: "Fixed-Income Bond (Price / Yield / Duration)",
    description:
      "Price an annual-coupon bond P = Σ C/(1+y)^t + F/(1+y)^n, plus current yield, Macaulay and modified duration. couponRate/yieldRate are FRACTIONS (0.05 = 5%); when coupon = yield the bond trades at par.",
    category: "finance",
    inputSchema: {
      type: "object",
      properties: {
        face: { type: "number", description: "Face value.", exclusiveMinimum: 0 },
        couponRate: { type: "number", description: "Annual coupon rate as a fraction (0.05 = 5%).", minimum: 0 },
        years: { type: "number", description: "Years to maturity (floored to an integer).", exclusiveMinimum: 0 },
        yieldRate: { type: "number", description: "Yield to maturity as a fraction (0.05 = 5%)." },
      },
      required: ["face", "couponRate", "years", "yieldRate"],
      additionalProperties: false,
    },
    run: (a) => bondSummary(a),
  },
  {
    name: "var",
    title: "Value at Risk (VaR) & Expected Shortfall",
    description:
      "Parametric (Gaussian) VaR = z·σ_h − μ_h and expected shortfall ES (CVaR) over a holding period, with σ_h = σ·√(h/252) and z = Φ⁻¹(confidence). mu/sigma are FRACTIONS (0.20 = 20%); horizonDays in trading days; confidence in (0,1).",
    category: "risk",
    inputSchema: {
      type: "object",
      properties: {
        positionValue: { type: "number", description: "Position/holding value in currency.", exclusiveMinimum: 0 },
        mu: { type: "number", description: "Annualized mean return as a fraction (0.10 = 10%); default 0." },
        sigma: { type: "number", description: "Annualized volatility as a fraction (0.20 = 20%).", exclusiveMinimum: 0 },
        horizonDays: { type: "number", description: "Holding period in trading days; default 1.", minimum: 0 },
        confidence: { type: "number", description: "Confidence level in (0,1) (0.95 = 95%); default 0.95.", exclusiveMinimum: 0, exclusiveMaximum: 1 },
      },
      required: ["positionValue", "sigma"],
      additionalProperties: false,
    },
    run: (a) => varSummary(a),
  },
  {
    name: "realEstate",
    title: "Real Estate Investment Analysis",
    description:
      "Net Operating Income, cap rate, monthly P&I, annual cash flow, cash-on-cash, DSCR, LTV and cap-rate-implied valuation. mortgageRate/targetCapRate are FRACTIONS (0.065 = 6.5%); downPayment in [0, purchasePrice].",
    category: "invest",
    inputSchema: {
      type: "object",
      properties: {
        purchasePrice: { type: "number", description: "Purchase price in currency.", exclusiveMinimum: 0 },
        downPayment: { type: "number", description: "Cash down payment (0 = fully financed, = price = all-cash).", minimum: 0 },
        annualRent: { type: "number", description: "Gross annual rent.", exclusiveMinimum: 0 },
        operatingExpenses: { type: "number", description: "Annual operating expenses excluding debt service.", minimum: 0 },
        mortgageRate: { type: "number", description: "Mortgage annual rate as a fraction (0.065 = 6.5%); default 0.", minimum: 0 },
        loanTermYears: { type: "number", description: "Loan term in years; default 0.", minimum: 0 },
        targetCapRate: { type: "number", description: "Target cap rate as a fraction (0.08 = 8%) to back into implied value; default 0.", minimum: 0 },
      },
      required: ["purchasePrice", "annualRent"],
      additionalProperties: false,
    },
    run: (a) => realEstateSummary(a),
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
