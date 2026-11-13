// pages/api/signals.js — 对外信号 API（Edge 运行时，无密钥，always 200）
// 手册 §5 API 层 / Phase 4「信号 API」。返回按胜率排序的三引擎信号 + 置信区间 + 假设 + 免责。
import { buildSignalApi, DEFAULT_UNIVERSE } from "../../lib/signalApi.js";

export const config = { runtime: "edge" };

export default function handler() {
  const body = buildSignalApi(DEFAULT_UNIVERSE, undefined, {
    generatedAt: new Date().toISOString(),
    dataMode: "estimated",
  });
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
