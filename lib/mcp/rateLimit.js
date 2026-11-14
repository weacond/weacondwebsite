// lib/mcp/rateLimit.js — 简易内存令牌桶限流（无状态运行时的务实降级）
//
// 注意：在 Vercel / Cloudflare 等无状态运行时，内存桶是「每实例」计数，并非全局；
// 冷启动/扩缩容会重置。它用于防突发滥用与单体/本地部署；生产级全局限流需接入
// 共享存储（Redis / KV / Upstash 等）。本实现刻意保持零依赖、纯函数式工厂。
//
// 连续补充令牌桶：速率 = limitPerMin / 60000 令牌/毫秒，每个桶最多存 limitPerMin。

const buckets = new Map(); // key -> { tokens, ts }
const MAX_BUCKETS = 20000; // 防止 Map 无界增长

/**
 * 创建限流器。
 * @param {number} limitPerMin 每分钟允许的最大请求数（默认 120）
 * @returns {(key:string) => {ok:boolean, limit:number, remaining:number, retryAfterMs?:number}}
 */
export function makeLimiter(limitPerMin = 120) {
  const rate = limitPerMin / 60000; // 令牌/毫秒
  return function check(key) {
    const now = Date.now();
    let b = buckets.get(key);
    if (!b) {
      b = { tokens: limitPerMin, ts: now };
      if (buckets.size >= MAX_BUCKETS) buckets.clear(); // 简单 gc
      buckets.set(key, b);
    }
    // 按流逝时间连续补充
    b.tokens = Math.min(limitPerMin, b.tokens + (now - b.ts) * rate);
    b.ts = now;
    if (b.tokens < 1) {
      const retryAfterMs = Math.ceil((1 - b.tokens) / rate);
      return { ok: false, limit: limitPerMin, remaining: 0, retryAfterMs };
    }
    b.tokens -= 1;
    return { ok: true, limit: limitPerMin, remaining: Math.floor(b.tokens) };
  };
}

// 暴露内部计数（仅用于测试与可观测性；生产请勿依赖）
export function _debugSize() {
  return buckets.size;
}
