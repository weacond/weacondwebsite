#!/usr/bin/env node
/**
 * 部署就绪度自检 — 回答"网站现在能不能买书"。
 *
 * 逐项检查：关键密钥（Stripe/Supabase/R2）+ 可选密钥（Alpha Vantage/OpenAI）+ 内容文件，
 * 打印可自动判定的就绪项 + 明确结论："能 / 不能线上购买，还差什么"。
 *
 * 仅本地或 CI 运行；**只打印状态，绝不回显密钥值**。
 * 退出码：全部就绪 = 0；存在阻断项 = 1（可接入 CI 门禁）。
 *
 * 用法：
 *   node scripts/checkDeploy.mjs
 *   node scripts/checkDeploy.mjs /path/to/.env.production
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = process.argv[2] || path.join(ROOT, ".env.local");

// —— 解析 .env（简单 KEY=VALUE，忽略注释/空行，剥首尾引号）——
function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return { env, found: false };
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = raw.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return { env, found: true };
}

// —— 占位符识别：英文 + 中文占位串 ——
const PLACEHOLDER = /your|xxxx|placeholder|todo|示例|粘贴|你的|sample|\$<|<\w+>|\[\w+\]/i;
function varState(val) {
  if (!val) return "missing";
  if (PLACEHOLDER.test(val)) return "placeholder";
  return "ok";
}
// 一个集成的状态 = 其所有变量里最差的那个
function integrationState(states) {
  if (states.some((s) => s === "missing")) return "missing";
  if (states.some((s) => s === "placeholder")) return "placeholder";
  return "ok";
}

// critical = 缺失则阻断"购买"；非 critical 缺失仅导致功能优雅降级
const INTEGRATIONS = [
  { name: "Stripe 收款", critical: true, vars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] },
  { name: "Supabase 记录", critical: true, vars: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] },
  { name: "R2 内容交付", critical: true, vars: ["R2_ACCOUNT_ID", "R2_API_TOKEN"] },
  { name: "Alpha Vantage", critical: false, vars: ["ALPHA_VANTAGE_API_KEY"] },
  { name: "OpenAI AI", critical: false, vars: ["OPENAI_API_KEY"] },
];

const FILES = [
  { rel: "supabase/schema.sql", desc: "Supabase schema（purchases + RLS）" },
  { rel: "public/ebooks/index.json", desc: "电子书目录" },
  { rel: "private/ebooks/content", desc: "正文 md（私有）", dir: true },
  { rel: "private/ebooks/files", desc: "PDF/EPUB（私有）", dir: true },
];

function main() {
  const { env, found } = loadEnv(envFile);
  console.log("=== Weacond 部署就绪度自检 ===");
  console.log("env 文件: " + (found ? envFile + "  ✓已找到" : envFile + "  ✗未找到"));
  console.log("");

  let criticalBlockers = 0;
  let softMissing = 0;

  console.log("--- 密钥 / 集成 ---");
  for (const it of INTEGRATIONS) {
    const states = it.vars.map((v) => varState(env[v]));
    const st = integrationState(states);
    let tag;
    if (st === "ok") tag = "✅ 就绪";
    else if (it.critical) { tag = "🔴 阻断"; criticalBlockers++; }
    else { tag = "⚠️ 缺失(非阻断)"; softMissing++; }
    console.log(
      "  " + tag + "  " + it.name.padEnd(16) + "  " +
      it.vars.map((v, i) => v + "=[" + states[i] + "]").join("  ")
    );
  }

  console.log("");
  console.log("--- 文件 ---");
  for (const f of FILES) {
    const exists = fs.existsSync(path.join(ROOT, f.rel));
    if (!exists) criticalBlockers++;
    console.log(
      "  " + (exists ? "✅" : "🔴") + "  " + (exists ? "存在" : "缺失").padEnd(4) + "  " +
      f.rel.padEnd(30) + "  " + f.desc
    );
  }

  console.log("");
  console.log("--- 结论 ---");
  if (criticalBlockers === 0) {
    console.log("✅ 可购买就绪：关键链路（收款/记录/交付）+ 内容文件齐备，可部署上线。");
    if (softMissing) console.log("   （另有 " + softMissing + " 项非阻断缺失，对应功能会优雅降级）");
    process.exit(0);
  } else {
    console.log(
      "🔴 尚未就绪：还有 " + criticalBlockers +
      " 项阻断，现在【不能】线上购买。请按 DEPLOY.md 补齐对应步骤。"
    );
    process.exit(1);
  }
}

main();
