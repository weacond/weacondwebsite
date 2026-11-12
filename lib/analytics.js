// lib/analytics.js — 轻量事件埋点（纯函数核心 + 客户端薄封装）
//
// 设计目标：可测试、可序列化、尊重用户隐私（Do-Not-Track）。
// 核心为纯函数（normalizeEvent / shouldTrack / buildPayload），
// 客户端只做「采集 + 上报」的薄封装（见 components/Analytics.js）。
//
// 口径：事件统一为 { type, ...props, ts, locale }；DNT/disabled 时不上报。
// 全部纯函数，给定输入结果唯一（时间由 ctx.now 注入以便测试）。

/**
 * 归一化事件：合并 props 与上下文时间/语言。
 * @param {string} type 事件类型
 * @param {object} [props] 业务字段
 * @param {object} [ctx] { now?:()=>number, locale?:string }
 * @returns {object} 归一化事件
 * @throws type 非字符串时
 */
export function normalizeEvent(type, props = {}, ctx = {}) {
  if (typeof type !== "string" || type.length === 0) throw new Error("event type required");
  const clean = {};
  if (props && typeof props === "object") {
    for (const [k, v] of Object.entries(props)) {
      if (v != null && Number.isFinite(v) === (typeof v === "number")) clean[k] = v;
    }
  }
  return {
    type,
    ...clean,
    ts: typeof ctx.now === "function" ? ctx.now() : Date.now(),
    locale: ctx.locale || "zh",
  };
}

/**
 * 是否应上报：尊重 DNT 与 disabled 开关。
 * @param {object} [ctx] { dnt?:boolean, disabled?:boolean }
 * @returns {boolean}
 */
export function shouldTrack(ctx = {}) {
  if (ctx.disabled) return false;
  if (ctx.dnt) return false;
  return true;
}

/**
 * 构建可上报 payload（JSON 可序列化）。
 * @param {object} event 归一化事件
 * @param {object} [ctx] { url?:string, ua?:string, now?:()=>number }
 * @returns {object}
 */
export function buildPayload(event, ctx = {}) {
  if (!event || typeof event !== "object") throw new Error("event required");
  return {
    event,
    url: ctx.url || "",
    ua: ctx.ua || "",
    ts: typeof ctx.now === "function" ? ctx.now() : Date.now(),
  };
}

/**
 * 事件类型白名单（用于过滤垃圾/误埋点）。
 */
export const ALLOWED_EVENTS = new Set([
  "page_view", "cta_click", "tool_open", "search", "lang_switch", "signup",
]);

/**
 * 是否为允许的事件类型。
 * @returns {boolean}
 */
export function isAllowedEvent(type) {
  return ALLOWED_EVENTS.has(type);
}

/**
 * 完整上报决策：类型允许 + 应上报 → 返回 payload，否则 null。
 * @returns {object|null}
 */
export function track(type, props, ctx = {}) {
  if (!isAllowedEvent(type)) return null;
  if (!shouldTrack(ctx)) return null;
  const event = normalizeEvent(type, props, ctx);
  return buildPayload(event, ctx);
}
