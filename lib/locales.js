// lib/locales.js — i18n 语言别名（纯函数、可测试）
//
// 把语言前缀路由 /zh、/en 映射到语言码，并校验白名单。
// 供 pages/zh.js、pages/en.js 等「语言别名重定向页」复用，
// 也为后续完整 i18n 路由（/zh + /en 路径 + 独立 sitemap）预留单一事实源。
//
// 当前模型：同一页双语切换（LanguageContext，localStorage key "weacond_lang"）；
// 别名路由作为「可分享的語言入口」，落地后重定向到首页并设置语言。
// 全部纯函数，给定输入结果唯一。

/**
 * 支持的语言白名单。
 * @returns {string[]}
 */
export const LOCALES = ["zh", "en"];

/**
 * 归一化语言码：在白名单内返回之，否则 null。
 * @param {string} x
 * @returns {string|null}
 */
export function normalizeLocale(x) {
  return LOCALES.includes(x) ? x : null;
}

/**
 * 语言别名路径：/zh、/en；非法 → null。
 * @param {string} locale
 * @returns {string|null}
 */
export function localeAliasPath(locale) {
  const l = normalizeLocale(locale);
  return l ? `/${l}` : null;
}

/**
 * 从任意路径解析语言前缀：/zh/risk → "zh"，/en → "en"，其余 → null。
 * @param {string} path
 * @returns {string|null}
 */
export function localeFromPath(path) {
  if (typeof path !== "string") return null;
  const m = path.match(/^\/(zh|en)(?:\/|$)/);
  return m ? m[1] : null;
}

/**
 * 语言别名页落地后应重定向到的目标（默认首页）。
 * @param {object} [opts] { home?:string }
 * @returns {string}
 */
export function aliasRedirectTarget(opts = {}) {
  return typeof opts.home === "string" ? opts.home : "/";
}
