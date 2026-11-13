// tests/launchReadiness.test.mjs
// 上线就绪度审计：纯函数判断「哪些核心服务已配 / 还缺」，绝不回传密钥值。
import {
  assessReadiness,
  READINESS_CHECKS,
} from "../lib/launchReadiness.js";

// 所有 blocker 类 env 变量（除法律主体外）
const BLOCKER_ENV = READINESS_CHECKS.filter((c) => c.severity === "blocker").map((c) => c.var);

function blockerEnv() {
  const env = {};
  for (const k of BLOCKER_ENV) env[k] = "configured-value-" + k;
  return env;
}

// 1) 全空 → 不可上线，blocker 缺失 = 全部 blocker 数
const r0 = assessReadiness({});
console.log("ready(empty):", r0.ready, "| blockersMissing:", r0.summary.blockersMissing);
console.assert(r0.ready === false, "empty must NOT be ready");
console.assert(r0.summary.blockersMissing === BLOCKER_ENV.length + 1, "missing should include legal blocker");
console.assert(r0.summary.total === READINESS_CHECKS.length + 1, "total = checks + 1 legal");

// 2) 所有 blocker 已配 + 法律主体已定 → 可上线（recommended/optional 可缺）
const r1 = assessReadiness(blockerEnv(), { governingLaw: "Singapore" });
console.log("ready(all blockers+law):", r1.ready, "| todo:", r1.todo.length);
console.assert(r1.ready === true, "all blockers + governingLaw => ready");
console.assert(r1.todo.length === 0, "ready => no todo");

// 3) 占位值不算已配置（.env.example 风格 "your-..."）
const r2 = assessReadiness({ ALPHA_VANTAGE_API_KEY: "your-alpha-vantage-api-key" });
console.assert(r2.checks.find((c) => c.var === "ALPHA_VANTAGE_API_KEY").configured === false, "placeholder must count as unconfigured");
console.log("placeholder treated as unconfigured: ok");

// 4) 部分配置：缺一个 blocker → 不可上线，且 todo 含该项、blocker 排在前面
const partial = blockerEnv();
delete partial.STRIPE_WEBHOOK_SECRET;
const r3 = assessReadiness(partial, { governingLaw: "Singapore" });
console.assert(r3.ready === false, "one blocker missing => not ready");
console.assert(r3.todo.length === 1 && r3.todo[0].what.includes("Webhook"), "todo should list the missing webhook (blocker first)");
console.log("partial(missing webhook) ready:", r3.ready, "| todo[0]:", r3.todo[0] && r3.todo[0].what);

// 5) 不回传密钥值：输出里不应出现任何配置的密钥字符串
const env = blockerEnv();
const r4 = assessReadiness(env, { governingLaw: "Singapore" });
const blob = JSON.stringify(r4);
console.assert(!blob.includes("configured-value-"), "must NOT leak any secret value");
console.assert(r4.note && /不回传/.test(r4.note), "note should state no secret leakage");
console.log("no secret leakage: ok");

// 6) 法律主体单独成 blocker：配齐 env 但缺 governingLaw → 不可上线
const r5 = assessReadiness(blockerEnv(), { governingLaw: "" });
console.assert(r5.ready === false, "missing governingLaw => not ready (legal is a blocker)");
const legalTodo = r5.todo.find((t) => t.what.includes("适用法律"));
console.assert(legalTodo, "todo should include the legal/jurisdiction item");
console.log("legal blocker enforced: ready=", r5.ready, "| legal in todo:", Boolean(legalTodo));

// 7) recommended（FRED）缺失不影响 ready
const r6 = assessReadiness(blockerEnv(), { governingLaw: "Singapore" });
console.assert(r6.summary.recommendedMissing >= 1, "FRED (recommended) should be counted as missing");
console.log("recommended(FRED) missing:", r6.summary.recommendedMissing, "but ready:", r6.ready);

console.log("ALL PASS");
